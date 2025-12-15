import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateReservationDto, 
  UpdateReservationDto,
  AssignVehicleDto,
  CheckAvailabilityDto,
  GetScheduleDto,
  ListReservationsDto
} from './dto';
import { ReservationStatus, AuditAction, Prisma } from '@prisma/client';
import { differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate reservation number in format: RES-{YEAR}-{SEQUENCE}
   */
  private async generateReservationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RES-${year}-`;

    // Get the last reservation for this year
    const lastReservation = await this.prisma.reservation.findFirst({
      where: {
        reservationNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        reservationNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastReservation) {
      const lastNumber = lastReservation.reservationNumber.split('-')[2];
      sequence = parseInt(lastNumber, 10) + 1;
    }

    // Pad sequence with zeros (e.g., 00001)
    const paddedSequence = sequence.toString().padStart(5, '0');
    return `${prefix}${paddedSequence}`;
  }

  /**
   * Calculate estimated days between two dates
   */
  private calculateEstimatedDays(dateOut: Date, dateDue: Date): number {
    const milliseconds = dateDue.getTime() - dateOut.getTime();
    const days = milliseconds / (1000 * 60 * 60 * 24);
    return Math.round(days * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate estimated total cost
   */
  private async calculateEstimatedTotal(
    vehicleClassId: number,
    rateCode: string,
    estimatedDays: number,
    estimatedMiles?: number,
  ): Promise<number> {
    const vehicleClass = await this.prisma.vehicleClass.findUnique({
      where: { id: vehicleClassId },
    });

    if (!vehicleClass) {
      throw new NotFoundException('Vehicle class not found');
    }

    // Basic calculation: dailyRate * days + mileageRate * miles
    let total = Number(vehicleClass.dailyRate) * estimatedDays;

    if (estimatedMiles) {
      total += Number(vehicleClass.mileageRate) * estimatedMiles;
    }

    // Apply rate discounts (simplified logic)
    if (rateCode === 'WEEKEND') {
      total *= 0.9; // 10% discount
    } else if (rateCode === 'CORPORATE') {
      total *= 0.85; // 15% discount
    }

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    reservationId: number,
    action: AuditAction,
    newValues: any,
    oldValues?: any,
    changedBy: string = 'system',
  ) {
    await this.prisma.reservationAuditLog.create({
      data: {
        reservationId,
        action,
        newValues,
        oldValues,
        changedBy,
      },
    });
  }

  /**
   * Validate reservation dates
   */
  private validateDates(dateOut: Date, dateDue: Date) {
    if (!isAfter(dateDue, dateOut)) {
      throw new BadRequestException('Return date must be after pickup date');
    }

    // Can't book in the past (with 1 hour grace period)
    const now = new Date();
    now.setHours(now.getHours() - 1);
    
    if (isBefore(dateOut, now)) {
      throw new BadRequestException('Cannot create reservations in the past');
    }
  }

  /**
   * Check if reservation can be modified
   */
  private async canModifyReservation(reservationId: number): Promise<void> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      reservation.reservationStatus === ReservationStatus.COMPLETED ||
      reservation.reservationStatus === ReservationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot modify ${reservation.reservationStatus.toLowerCase()} reservation`,
      );
    }
  }

  /**
   * Create a new reservation
   */
  async create(createReservationDto: CreateReservationDto) {
    const dateOut = parseISO(createReservationDto.dateOut);
    const dateDue = parseISO(createReservationDto.dateDue);

    // Validate dates
    this.validateDates(dateOut, dateDue);

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: createReservationDto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify vehicle class exists
    const vehicleClass = await this.prisma.vehicleClass.findUnique({
      where: { id: createReservationDto.vehicleClassId },
    });
    if (!vehicleClass) {
      throw new NotFoundException('Vehicle class not found');
    }

    // Verify locations exist
    const locationOut = await this.prisma.location.findUnique({
      where: { code: createReservationDto.locationCodeOut },
    });
    const locationDue = await this.prisma.location.findUnique({
      where: { code: createReservationDto.locationCodeDue },
    });
    if (!locationOut || !locationDue) {
      throw new NotFoundException('One or both locations not found');
    }

    // Verify rate exists
    const rate = await this.prisma.rateHead.findUnique({
      where: { code: createReservationDto.rateCode },
    });
    if (!rate) {
      throw new NotFoundException('Rate code not found');
    }

    // Calculate estimates
    const estimatedDays = this.calculateEstimatedDays(dateOut, dateDue);
    const estimatedTotal = await this.calculateEstimatedTotal(
      createReservationDto.vehicleClassId,
      createReservationDto.rateCode,
      estimatedDays,
      createReservationDto.estimatedMiles,
    );

    // Generate reservation number
    const reservationNumber = await this.generateReservationNumber();

    // Create reservation
    const reservation = await this.prisma.reservation.create({
      data: {
        reservationNumber,
        customerId: createReservationDto.customerId,
        vehicleClassId: createReservationDto.vehicleClassId,
        dateOut,
        dateDue,
        locationCodeOut: createReservationDto.locationCodeOut,
        locationCodeDue: createReservationDto.locationCodeDue,
        rateCode: createReservationDto.rateCode,
        estimatedDays,
        estimatedTotal,
        estimatedMiles: createReservationDto.estimatedMiles,
        notes: createReservationDto.notes,
        customerNotes: createReservationDto.customerNotes,
        reservationStatus: ReservationStatus.QUOTE,
        createdBy: createReservationDto.createdBy || 'system',
        modifiedBy: createReservationDto.createdBy || 'system',
      },
      include: {
        customer: true,
        vehicleClass: true,
        pickupLocation: true,
        dropoffLocation: true,
        rateHead: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      reservation.id,
      AuditAction.CREATED,
      reservation,
      null,
      createReservationDto.createdBy || 'system',
    );

    return reservation;
  }

  /**
   * Get reservation by ID
   */
  async findOne(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicleClass: true,
        vehicle: true,
        pickupLocation: true,
        dropoffLocation: true,
        rateHead: true,
        auditLogs: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  /**
   * List reservations with filtering and pagination
   */
  async findAll(query: ListReservationsDto) {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      ...filters 
    } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.ReservationWhereInput = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.vehicleClassId) {
      where.vehicleClassId = filters.vehicleClassId;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.locationCodeOut) {
      where.locationCodeOut = filters.locationCodeOut;
    }

    if (filters.reservationStatus && filters.reservationStatus.length > 0) {
      where.reservationStatus = { in: filters.reservationStatus };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.AND = [];
      if (filters.dateFrom) {
        where.AND.push({ dateOut: { gte: parseISO(filters.dateFrom) } });
      }
      if (filters.dateTo) {
        where.AND.push({ dateDue: { lte: parseISO(filters.dateTo) } });
      }
    }

    // Get total count
    const total = await this.prisma.reservation.count({ where });

    // Get reservations
    const reservations = await this.prisma.reservation.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: true,
        vehicleClass: true,
        vehicle: true,
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    return {
      data: reservations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update reservation
   */
  async update(id: number, updateReservationDto: UpdateReservationDto) {
    await this.canModifyReservation(id);

    const oldReservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    // Validate dates if they're being updated
    if (updateReservationDto.dateOut || updateReservationDto.dateDue) {
      const dateOut = updateReservationDto.dateOut 
        ? parseISO(updateReservationDto.dateOut) 
        : oldReservation.dateOut;
      const dateDue = updateReservationDto.dateDue 
        ? parseISO(updateReservationDto.dateDue) 
        : oldReservation.dateDue;
      
      this.validateDates(dateOut, dateDue);
    }

    // Recalculate estimates if needed
    let estimatedDays = oldReservation.estimatedDays;
    let estimatedTotal = oldReservation.estimatedTotal;

    const dateOut = updateReservationDto.dateOut 
      ? parseISO(updateReservationDto.dateOut) 
      : oldReservation.dateOut;
    const dateDue = updateReservationDto.dateDue 
      ? parseISO(updateReservationDto.dateDue) 
      : oldReservation.dateDue;

    if (
      updateReservationDto.dateOut || 
      updateReservationDto.dateDue ||
      updateReservationDto.vehicleClassId ||
      updateReservationDto.rateCode ||
      updateReservationDto.estimatedMiles !== undefined
    ) {
      const calculatedDays = this.calculateEstimatedDays(dateOut, dateDue);
      const calculatedTotal = await this.calculateEstimatedTotal(
        updateReservationDto.vehicleClassId || oldReservation.vehicleClassId,
        updateReservationDto.rateCode || oldReservation.rateCode,
        calculatedDays,
        updateReservationDto.estimatedMiles ?? oldReservation.estimatedMiles,
      );
      
      estimatedDays = calculatedDays as any;
      estimatedTotal = calculatedTotal as any;
    }

    // Update reservation
    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        ...updateReservationDto,
        dateOut: updateReservationDto.dateOut ? parseISO(updateReservationDto.dateOut) : undefined,
        dateDue: updateReservationDto.dateDue ? parseISO(updateReservationDto.dateDue) : undefined,
        estimatedDays,
        estimatedTotal,
        modifiedBy: updateReservationDto.modifiedBy || 'system',
      },
      include: {
        customer: true,
        vehicleClass: true,
        vehicle: true,
        pickupLocation: true,
        dropoffLocation: true,
        rateHead: true,
      },
    });

    // Create audit log
    const action = updateReservationDto.reservationStatus 
      ? AuditAction.STATUS_CHANGED 
      : AuditAction.MODIFIED;

    await this.createAuditLog(
      id,
      action,
      reservation,
      oldReservation,
      updateReservationDto.modifiedBy || 'system',
    );

    return reservation;
  }

  /**
   * Cancel reservation
   */
  async cancel(id: number, cancelledBy: string = 'system') {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      reservation.reservationStatus === ReservationStatus.CHECKED_OUT ||
      reservation.reservationStatus === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel ${reservation.reservationStatus.toLowerCase()} reservation`,
      );
    }

    if (reservation.reservationStatus === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    const oldReservation = { ...reservation };

    // Cancel reservation
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        reservationStatus: ReservationStatus.CANCELLED,
        vehicleId: null,
        modifiedBy: cancelledBy,
      },
      include: {
        customer: true,
        vehicleClass: true,
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      id,
      AuditAction.CANCELLED,
      updated,
      oldReservation,
      cancelledBy,
    );

    return updated;
  }

  /**
   * Assign vehicle to reservation
   */
  async assignVehicle(id: number, assignVehicleDto: AssignVehicleDto, assignedBy: string = 'system') {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { vehicleClass: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Check if reservation can be modified
    if (
      reservation.reservationStatus === ReservationStatus.COMPLETED ||
      reservation.reservationStatus === ReservationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot assign vehicle to ${reservation.reservationStatus.toLowerCase()} reservation`,
      );
    }

    // Verify vehicle exists and is of the correct class
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: assignVehicleDto.vehicleId },
      include: { vehicleClass: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.vehicleClassId !== reservation.vehicleClassId) {
      throw new BadRequestException(
        `Vehicle class mismatch. Expected ${reservation.vehicleClass.name}, got ${vehicle.vehicleClass.name}`,
      );
    }

    // Check for overbooking (warn but don't prevent)
    const overlappingReservations = await this.checkOverlap(
      assignVehicleDto.vehicleId,
      reservation.dateOut,
      reservation.dateDue,
      id,
    );

    const oldReservation = { ...reservation };

    // Assign vehicle
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        vehicleId: assignVehicleDto.vehicleId,
        modifiedBy: assignedBy,
      },
      include: {
        customer: true,
        vehicleClass: true,
        vehicle: true,
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      id,
      AuditAction.VEHICLE_ASSIGNED,
      updated,
      oldReservation,
      assignedBy,
    );

    return {
      reservation: updated,
      overbookingWarning: overlappingReservations.length > 0,
      overlappingReservations: overlappingReservations.length,
    };
  }

  /**
   * Unassign vehicle from reservation
   */
  async unassignVehicle(id: number, unassignedBy: string = 'system') {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      reservation.reservationStatus === ReservationStatus.CHECKED_OUT ||
      reservation.reservationStatus === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot unassign vehicle from ${reservation.reservationStatus.toLowerCase()} reservation`,
      );
    }

    if (!reservation.vehicleId) {
      throw new BadRequestException('No vehicle assigned to this reservation');
    }

    const oldReservation = { ...reservation };

    // Unassign vehicle
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        vehicleId: null,
        modifiedBy: unassignedBy,
      },
      include: {
        customer: true,
        vehicleClass: true,
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      id,
      AuditAction.VEHICLE_UNASSIGNED,
      updated,
      oldReservation,
      unassignedBy,
    );

    return updated;
  }

  /**
   * Check for overlapping reservations (for overbooking detection)
   */
  private async checkOverlap(
    vehicleId: number,
    dateOut: Date,
    dateDue: Date,
    excludeReservationId?: number,
  ) {
    const where: Prisma.ReservationWhereInput = {
      vehicleId,
      reservationStatus: {
        in: [
          ReservationStatus.QUOTE,
          ReservationStatus.CONFIRMED,
          ReservationStatus.CHECKED_OUT,
        ],
      },
      OR: [
        {
          AND: [
            { dateOut: { lt: dateDue } },
            { dateDue: { gt: dateOut } },
          ],
        },
      ],
    };

    if (excludeReservationId) {
      where.id = { not: excludeReservationId };
    }

    return this.prisma.reservation.findMany({ where });
  }

  /**
   * Check availability for a vehicle class
   */
  async checkAvailability(query: CheckAvailabilityDto) {
    const dateOut = parseISO(query.dateOut);
    const dateDue = parseISO(query.dateDue);

    // Validate dates
    this.validateDates(dateOut, dateDue);

    // Get all vehicles of this class at the pickup location
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        vehicleClassId: query.vehicleClassId,
        location: {
          code: query.locationCodeOut,
        },
        status: 'AVAILABLE',
      },
      include: {
        reservations: {
          where: {
            reservationStatus: {
              in: [
                ReservationStatus.QUOTE,
                ReservationStatus.CONFIRMED,
                ReservationStatus.CHECKED_OUT,
              ],
            },
            OR: [
              {
                AND: [
                  { dateOut: { lt: dateDue } },
                  { dateDue: { gt: dateOut } },
                ],
              },
            ],
          },
        },
      },
    });

    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(
      (vehicle) => vehicle.reservations.length === 0,
    );

    return {
      vehicleClassId: query.vehicleClassId,
      locationCodeOut: query.locationCodeOut,
      locationCodeDue: query.locationCodeDue,
      dateOut: query.dateOut,
      dateDue: query.dateDue,
      totalVehicles,
      availableCount: availableVehicles.length,
      availableVehicles: availableVehicles.map((v) => ({
        id: v.id,
        unitNumber: v.unitNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
      })),
      occupiedCount: totalVehicles - availableVehicles.length,
    };
  }

  /**
   * Get reservation schedule for timeline view
   */
  async getSchedule(query: GetScheduleDto) {
    const dateFrom = parseISO(query.dateFrom);
    const dateTo = parseISO(query.dateTo);

    // Build vehicle filter
    const vehicleWhere: Prisma.VehicleWhereInput = {
      status: 'AVAILABLE',
    };

    if (query.locationCode) {
      vehicleWhere.location = { code: query.locationCode };
    }

    if (query.vehicleClassId) {
      vehicleWhere.vehicleClassId = query.vehicleClassId;
    }

    // Get vehicles with their reservations in the date range
    const vehicles = await this.prisma.vehicle.findMany({
      where: vehicleWhere,
      include: {
        vehicleClass: true,
        location: true,
        reservations: {
          where: {
            reservationStatus: {
              in: [
                ReservationStatus.QUOTE,
                ReservationStatus.CONFIRMED,
                ReservationStatus.CHECKED_OUT,
              ],
            },
            OR: [
              {
                AND: [
                  { dateOut: { lt: dateTo } },
                  { dateDue: { gt: dateFrom } },
                ],
              },
            ],
          },
          include: {
            customer: true,
            vehicleClass: true,
          },
          orderBy: { dateOut: 'asc' },
        },
      },
      orderBy: [
        { vehicleClass: { name: 'asc' } },
        { unitNumber: 'asc' },
      ],
    });

    // Get unassigned reservations
    const unassignedReservations = await this.prisma.reservation.findMany({
      where: {
        vehicleId: null,
        reservationStatus: {
          in: [ReservationStatus.QUOTE, ReservationStatus.CONFIRMED],
        },
        OR: [
          {
            AND: [
              { dateOut: { lt: dateTo } },
              { dateDue: { gt: dateFrom } },
            ],
          },
        ],
        ...(query.locationCode && { locationCodeOut: query.locationCode }),
        ...(query.vehicleClassId && { vehicleClassId: query.vehicleClassId }),
      },
      include: {
        customer: true,
        vehicleClass: true,
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: { dateOut: 'asc' },
    });

    return {
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        unitNumber: vehicle.unitNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        vehicleClass: {
          id: vehicle.vehicleClass.id,
          name: vehicle.vehicleClass.name,
        },
        location: {
          code: vehicle.location.code,
          name: vehicle.location.name,
        },
        reservations: vehicle.reservations.map((r) => ({
          id: r.id,
          reservationNumber: r.reservationNumber,
          customer: {
            firstName: r.customer.firstName,
            lastName: r.customer.lastName,
          },
          dateOut: r.dateOut,
          dateDue: r.dateDue,
          reservationStatus: r.reservationStatus,
          estimatedTotal: r.estimatedTotal,
        })),
      })),
      unassignedReservations: unassignedReservations.map((r) => ({
        id: r.id,
        reservationNumber: r.reservationNumber,
        customer: {
          firstName: r.customer.firstName,
          lastName: r.customer.lastName,
        },
        vehicleClass: {
          id: r.vehicleClass.id,
          name: r.vehicleClass.name,
        },
        dateOut: r.dateOut,
        dateDue: r.dateDue,
        reservationStatus: r.reservationStatus,
        estimatedTotal: r.estimatedTotal,
        locationCodeOut: r.locationCodeOut,
        locationCodeDue: r.locationCodeDue,
      })),
    };
  }
}