import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query('vehicleClassId', ParseIntPipe) vehicleClassId?: number) {
    if (vehicleClassId) {
      return this.vehiclesService.findByClass(vehicleClassId);
    }
    return this.vehiclesService.findAll();
  }
}
