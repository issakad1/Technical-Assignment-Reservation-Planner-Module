import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: {
        vehicleClass: true,
        location: true,
      },
    });
  }

  async findByClass(vehicleClassId: number) {
    return this.prisma.vehicle.findMany({
      where: { vehicleClassId },
      include: { vehicleClass: true, location: true },
    });
  }
}
