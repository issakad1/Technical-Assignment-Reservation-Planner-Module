import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getVehicleClassUtilization() {
    const vehicleClasses = await this.prisma.vehicleClass.findMany({
      include: {
        vehicles: true,
        reservations: {
          where: {
            reservationStatus: { in: ['CONFIRMED', 'CHECKED_OUT', 'COMPLETED'] },
          },
        },
      },
    });

    return vehicleClasses.map(vc => ({
      vehicleClass: vc.name,
      totalVehicles: vc.vehicles.length,
      totalReservations: vc.reservations.length,
      utilizationRate: vc.vehicles.length > 0 
        ? (vc.reservations.length / vc.vehicles.length * 100).toFixed(2)
        : 0,
    }));
  }
}