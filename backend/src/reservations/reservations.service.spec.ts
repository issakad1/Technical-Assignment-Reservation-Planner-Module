import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    reservation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    vehicleClass: {
      findUnique: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    rateHead: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    reservationAuditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a reservation with valid data', async () => {
      const createDto = {
        customerId: 1,
        vehicleClassId: 1,
        locationCodeOut: 'LAX',
        locationCodeDue: 'SFO',
        dateOut: '2025-12-20T10:00:00Z',
        dateDue: '2025-12-25T10:00:00Z',
        rateCode: 'STANDARD',
        estimatedMiles: 500,
        createdBy: 'test-user',
      };

      const mockCustomer = { id: 1, firstName: 'John', lastName: 'Doe' };
      const mockVehicleClass = { id: 1, name: 'Standard', dailyRate: 45.00, mileageRate: 0.18 };
      const mockLocation = { code: 'LAX', name: 'Los Angeles' };
      const mockRate = { code: 'STANDARD', name: 'Standard Rate' };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicleClass.findUnique.mockResolvedValue(mockVehicleClass);
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocation);
      mockPrismaService.rateHead.findUnique.mockResolvedValue(mockRate);
      mockPrismaService.reservation.findFirst.mockResolvedValue(null);

      const mockReservation = {
        id: 1,
        reservationNumber: 'RES-2025-00001',
        ...createDto,
        estimatedDays: 5,
        estimatedTotal: 315.00,
        reservationStatus: ReservationStatus.QUOTE,
      };

      mockPrismaService.reservation.create.mockResolvedValue(mockReservation);
      mockPrismaService.reservationAuditLog.create.mockResolvedValue({});

      const result = await service.create(createDto);

      expect(result).toEqual(mockReservation);
      expect(mockPrismaService.reservation.create).toHaveBeenCalled();
      expect(mockPrismaService.reservationAuditLog.create).toHaveBeenCalled();
    });

    it('should throw error if dateOut is after dateDue', async () => {
      const createDto = {
        customerId: 1,
        vehicleClassId: 1,
        locationCodeOut: 'LAX',
        locationCodeDue: 'SFO',
        dateOut: '2025-12-25T10:00:00Z',
        dateDue: '2025-12-20T10:00:00Z', // Before dateOut
        rateCode: 'STANDARD',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if customer not found', async () => {
      const createDto = {
        customerId: 999,
        vehicleClassId: 1,
        locationCodeOut: 'LAX',
        locationCodeDue: 'SFO',
        dateOut: '2025-12-20T10:00:00Z',
        dateDue: '2025-12-25T10:00:00Z',
        rateCode: 'STANDARD',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a reservation by ID', async () => {
      const mockReservation = {
        id: 1,
        reservationNumber: 'RES-2025-00001',
        customerId: 1,
        vehicleClassId: 1,
        customer: { firstName: 'John', lastName: 'Doe' },
        vehicleClass: { name: 'Standard' },
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      const result = await service.findOne(1);

      expect(result).toEqual(mockReservation);
      expect(mockPrismaService.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation successfully', async () => {
      const mockReservation = {
        id: 1,
        reservationStatus: ReservationStatus.QUOTE,
        vehicleId: 1,
      };

      const mockUpdated = {
        ...mockReservation,
        reservationStatus: ReservationStatus.CANCELLED,
        vehicleId: null,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.reservation.update.mockResolvedValue(mockUpdated);
      mockPrismaService.reservationAuditLog.create.mockResolvedValue({});

      const result = await service.cancel(1);

      expect(result.reservationStatus).toBe(ReservationStatus.CANCELLED);
      expect(result.vehicleId).toBeNull();
    });

    it('should not allow cancelling a checked-out reservation', async () => {
      const mockReservation = {
        id: 1,
        reservationStatus: ReservationStatus.CHECKED_OUT,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
    });

    it('should not allow cancelling a completed reservation', async () => {
      const mockReservation = {
        id: 1,
        reservationStatus: ReservationStatus.COMPLETED,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
    });

    it('should not allow cancelling an already cancelled reservation', async () => {
      const mockReservation = {
        id: 1,
        reservationStatus: ReservationStatus.CANCELLED,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignVehicle', () => {
    it('should assign a vehicle to a reservation', async () => {
      const mockReservation = {
        id: 1,
        vehicleClassId: 1,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: new Date('2025-12-20'),
        dateDue: new Date('2025-12-25'),
        vehicleClass: { id: 1, name: 'Standard' },
      };

      const mockVehicle = {
        id: 1,
        unitNumber: 'A-101',
        vehicleClassId: 1,
        vehicleClass: { id: 1, name: 'Standard' },
      };

      const mockUpdated = {
        ...mockReservation,
        vehicleId: 1,
        vehicle: mockVehicle,
      };

      mockPrismaService.reservation.findUnique
        .mockResolvedValueOnce(mockReservation)
        .mockResolvedValueOnce(mockUpdated);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.reservation.findMany.mockResolvedValue([]); // No overlapping reservations
      mockPrismaService.reservation.update.mockResolvedValue(mockUpdated);
      mockPrismaService.reservationAuditLog.create.mockResolvedValue({});

      const result = await service.assignVehicle(1, { vehicleId: 1 });

      expect(result.reservation.vehicleId).toBe(1);
      expect(result.overbookingWarning).toBe(false);
    });

    it('should throw error if vehicle class mismatch', async () => {
      const mockReservation = {
        id: 1,
        vehicleClassId: 1,
        reservationStatus: ReservationStatus.CONFIRMED,
        vehicleClass: { id: 1, name: 'Standard' },
      };

      const mockVehicle = {
        id: 2,
        vehicleClassId: 2,
        vehicleClass: { id: 2, name: 'SUV' },
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);

      await expect(service.assignVehicle(1, { vehicleId: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should warn about overbooking if there are overlapping reservations', async () => {
      const mockReservation = {
        id: 1,
        vehicleClassId: 1,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: new Date('2025-12-20'),
        dateDue: new Date('2025-12-25'),
        vehicleClass: { id: 1, name: 'Standard' },
      };

      const mockVehicle = {
        id: 1,
        vehicleClassId: 1,
        vehicleClass: { id: 1, name: 'Standard' },
      };

      const mockOverlapping = [
        {
          id: 2,
          vehicleId: 1,
          dateOut: new Date('2025-12-22'),
          dateDue: new Date('2025-12-27'),
        },
      ];

      const mockUpdated = {
        ...mockReservation,
        vehicleId: 1,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.reservation.findMany.mockResolvedValue(mockOverlapping);
      mockPrismaService.reservation.update.mockResolvedValue(mockUpdated);
      mockPrismaService.reservationAuditLog.create.mockResolvedValue({});

      const result = await service.assignVehicle(1, { vehicleId: 1 });

      expect(result.overbookingWarning).toBe(true);
      expect(result.overlappingReservations).toBe(1);
    });
  });

  describe('unassignVehicle', () => {
    it('should unassign a vehicle from a reservation', async () => {
      const mockReservation = {
        id: 1,
        vehicleId: 1,
        reservationStatus: ReservationStatus.CONFIRMED,
      };

      const mockUpdated = {
        ...mockReservation,
        vehicleId: null,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.reservation.update.mockResolvedValue(mockUpdated);
      mockPrismaService.reservationAuditLog.create.mockResolvedValue({});

      const result = await service.unassignVehicle(1);

      expect(result.vehicleId).toBeNull();
    });

    it('should throw error if no vehicle assigned', async () => {
      const mockReservation = {
        id: 1,
        vehicleId: null,
        reservationStatus: ReservationStatus.CONFIRMED,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      await expect(service.unassignVehicle(1)).rejects.toThrow(BadRequestException);
    });

    it('should not allow unassigning from checked-out reservation', async () => {
      const mockReservation = {
        id: 1,
        vehicleId: 1,
        reservationStatus: ReservationStatus.CHECKED_OUT,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      await expect(service.unassignVehicle(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkAvailability', () => {
    it('should return available vehicles', async () => {
      const query = {
        vehicleClassId: 1,
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        dateOut: '2025-12-20T10:00:00Z',
        dateDue: '2025-12-25T10:00:00Z',
      };

      const mockVehicles = [
        {
          id: 1,
          unitNumber: 'A-101',
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Silver',
          reservations: [],
        },
        {
          id: 2,
          unitNumber: 'A-102',
          make: 'Honda',
          model: 'Accord',
          year: 2023,
          color: 'White',
          reservations: [{ id: 1 }], // Has a reservation
        },
      ];

      mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await service.checkAvailability(query);

      expect(result.totalVehicles).toBe(2);
      expect(result.availableCount).toBe(1);
      expect(result.occupiedCount).toBe(1);
      expect(result.availableVehicles).toHaveLength(1);
      expect(result.availableVehicles[0].unitNumber).toBe('A-101');
    });
  });
});
