import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus } from '@prisma/client';

interface AssignmentScore {
  vehicleId: number;
  score: number;
  reasons: string[];
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async autoAssignVehicles(locationCode?: string) {
    const unassignedReservations = await this.prisma.reservation.findMany({
      where: {
        vehicleId: null,
        reservationStatus: {
          in: [ReservationStatus.QUOTE, ReservationStatus.CONFIRMED],
        },
        ...(locationCode && { locationCodeOut: locationCode }),
      },
      include: {
        vehicleClass: true,
        customer: true,
      },
      orderBy: {
        dateOut: 'asc',
      },
    });

    const assignments = [];
    const errors = [];

    for (const reservation of unassignedReservations) {
      try {
        const bestVehicle = await this.findBestVehicle(reservation);
        
        if (bestVehicle) {
          await this.prisma.reservation.update({
            where: { id: reservation.id },
            data: { vehicleId: bestVehicle.vehicleId },
          });

          await this.prisma.reservationAuditLog.create({
            data: {
              reservationId: reservation.id,
              action: 'VEHICLE_ASSIGNED',
              newValues: { vehicleId: bestVehicle.vehicleId, aiAssigned: true },
              oldValues: { vehicleId: null },
              changedBy: 'AI_AUTO_ASSIGN',
            },
          });

          assignments.push({
            reservationId: reservation.id,
            reservationNumber: reservation.reservationNumber,
            vehicleId: bestVehicle.vehicleId,
            score: bestVehicle.score,
            reasons: bestVehicle.reasons,
          });
        } else {
          errors.push({
            reservationId: reservation.id,
            reservationNumber: reservation.reservationNumber,
            reason: 'No suitable vehicle found',
          });
        }
      } catch (error) {
        errors.push({
          reservationId: reservation.id,
          reservationNumber: reservation.reservationNumber,
          reason: error.message,
        });
      }
    }

    return {
      assigned: assignments.length,
      failed: errors.length,
      assignments,
      errors,
    };
  }

  private async findBestVehicle(reservation: any): Promise<AssignmentScore | null> {
    const availableVehicles = await this.prisma.vehicle.findMany({
      where: {
        vehicleClassId: reservation.vehicleClassId,
        location: {
          code: reservation.locationCodeOut,
        },
        status: 'AVAILABLE',
      },
      include: {
        reservations: {
          where: {
            reservationStatus: {
              in: [ReservationStatus.QUOTE, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_OUT],
            },
          },
        },
      },
    });

    if (availableVehicles.length === 0) {
      return null;
    }

    const scoredVehicles: AssignmentScore[] = [];

    for (const vehicle of availableVehicles) {
      const score = await this.calculateVehicleScore(vehicle, reservation);
      scoredVehicles.push(score);
    }

    scoredVehicles.sort((a, b) => b.score - a.score);
    return scoredVehicles[0].score > 0 ? scoredVehicles[0] : null;
  }

  private async calculateVehicleScore(vehicle: any, reservation: any): Promise<AssignmentScore> {
    let score = 100;
    const reasons: string[] = [];

    const hasConflict = this.hasDateConflict(
      vehicle.reservations,
      reservation.dateOut,
      reservation.dateDue,
    );

    if (hasConflict) {
      score -= 90;
      reasons.push('⚠️ Has overlapping reservation');
    } else {
      reasons.push('✅ No scheduling conflicts');
    }

    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - vehicle.year;
    
    if (vehicleAge === 0) {
      score += 15;
      reasons.push('✅ Brand new vehicle');
    } else if (vehicleAge === 1) {
      score += 10;
      reasons.push('✅ Very new vehicle');
    } else if (vehicleAge > 5) {
      score -= 10;
      reasons.push('⚠️ Older vehicle');
    }

    if (vehicle.mileage < 20000) {
      score += 10;
      reasons.push('✅ Low mileage');
    } else if (vehicle.mileage > 100000) {
      score -= 15;
      reasons.push('⚠️ High mileage');
    }

    const upcomingReservations = vehicle.reservations.filter(
      (r: any) => new Date(r.dateOut) >= new Date(),
    ).length;

    if (upcomingReservations === 0) {
      score += 10;
      reasons.push('✅ No upcoming reservations');
    } else if (upcomingReservations >= 3) {
      score -= 5;
      reasons.push('⚠️ Vehicle heavily booked');
    }

    return {
      vehicleId: vehicle.id,
      score: Math.max(0, score),
      reasons,
    };
  }

  private hasDateConflict(existingReservations: any[], newDateOut: Date, newDateDue: Date): boolean {
    return existingReservations.some((existing) => {
      return existing.dateOut < newDateDue && existing.dateDue > newDateOut;
    });
  }

  async getAssignmentRecommendations(reservationId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        vehicleClass: true,
        customer: true,
      },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.vehicleId) {
      return {
        message: 'Reservation already has a vehicle assigned',
        currentVehicleId: reservation.vehicleId,
      };
    }

    const availableVehicles = await this.prisma.vehicle.findMany({
      where: {
        vehicleClassId: reservation.vehicleClassId,
        location: { code: reservation.locationCodeOut },
        status: 'AVAILABLE',
      },
      include: {
        reservations: {
          where: {
            reservationStatus: {
              in: [ReservationStatus.QUOTE, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_OUT],
            },
          },
        },
      },
    });

    const recommendations = [];
    for (const vehicle of availableVehicles) {
      const score = await this.calculateVehicleScore(vehicle, reservation);
      recommendations.push({
        vehicleId: vehicle.id,
        unitNumber: vehicle.unitNumber,
        make: vehicle.make,
        model: vehicle.model,
        score: score.score,
        reasons: score.reasons,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);

    return {
      reservationId,
      reservationNumber: reservation.reservationNumber,
      totalOptions: recommendations.length,
      recommendations: recommendations.slice(0, 5),
    };
  }

  async getFleetUtilization(locationCode?: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        ...(locationCode && { location: { code: locationCode } }),
      },
      include: {
        vehicleClass: true,
        reservations: {
          where: {
            reservationStatus: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_OUT],
            },
            dateOut: { lte: end },
            dateDue: { gte: start },
          },
        },
      },
    });

    const utilizationByClass = {};

    for (const vehicle of vehicles) {
      const className = vehicle.vehicleClass.name;
      
      if (!utilizationByClass[className]) {
        utilizationByClass[className] = {
          className,
          totalVehicles: 0,
          averageUtilization: 0,
        };
      }

      utilizationByClass[className].totalVehicles++;
    }

    return {
      period: { start, end },
      byClass: Object.values(utilizationByClass),
    };
  }
}