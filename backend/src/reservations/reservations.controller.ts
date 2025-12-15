import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  AssignVehicleDto,
  CheckAvailabilityDto,
  GetScheduleDto,
  ListReservationsDto,
} from './dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Customer, Vehicle Class, or Location not found' })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all reservations with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of reservations' })
  findAll(@Query() query: ListReservationsDto) {
    return this.reservationsService.findAll(query);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check availability for a vehicle class' })
  @ApiResponse({ status: 200, description: 'Returns availability information' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  checkAvailability(@Query() query: CheckAvailabilityDto) {
    return this.reservationsService.checkAvailability(query);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get reservation schedule for timeline view' })
  @ApiResponse({ status: 200, description: 'Returns schedule data for vehicles and reservations' })
  getSchedule(@Query() query: GetScheduleDto) {
    return this.reservationsService.getSchedule(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiResponse({ status: 200, description: 'Returns reservation details' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify completed or cancelled reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel checked-out or completed reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.cancel(id);
  }

  @Post(':id/assign-vehicle')
  @ApiOperation({ summary: 'Assign a vehicle to a reservation' })
  @ApiResponse({ status: 200, description: 'Vehicle assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Reservation or Vehicle not found' })
  assignVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignVehicleDto: AssignVehicleDto,
  ) {
    return this.reservationsService.assignVehicle(id, assignVehicleDto);
  }

  @Delete(':id/assign-vehicle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unassign vehicle from a reservation' })
  @ApiResponse({ status: 200, description: 'Vehicle unassigned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot unassign from checked-out or completed reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  unassignVehicle(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.unassignVehicle(id);
  }
}
