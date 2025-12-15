export * from './create-reservation.dto';
export * from './update-reservation.dto';

import { ApiProperty } from '@nestjs/swagger';

import { IsInt, IsDateString, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class AssignVehicleDto {
  @ApiProperty({ description: 'Vehicle ID to assign' })
  @IsInt()
  vehicleId: number;
}

export class CheckAvailabilityDto {
  @ApiProperty({ description: 'Vehicle Class ID' })
  @IsInt()
  @Type(() => Number)
  vehicleClassId: number;

  @ApiProperty({ description: 'Pickup location code' })
  @IsString()
  locationCodeOut: string;

  @ApiProperty({ description: 'Dropoff location code' })
  @IsString()
  locationCodeDue: string;

  @ApiProperty({ description: 'Pickup date and time' })
  @IsDateString()
  dateOut: string;

  @ApiProperty({ description: 'Return date and time' })
  @IsDateString()
  dateDue: string;
}

export class GetScheduleDto {
  @ApiProperty({ description: 'Location code', required: false })
  @IsOptional()
  @IsString()
  locationCode?: string;

  @ApiProperty({ description: 'Vehicle Class ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vehicleClassId?: number;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  dateTo: string;
}

export class ListReservationsDto {
  @ApiProperty({ description: 'Customer ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;

  @ApiProperty({ description: 'Vehicle Class ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vehicleClassId?: number;

  @ApiProperty({ description: 'Vehicle ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vehicleId?: number;

  @ApiProperty({ description: 'Pickup location code', required: false })
  @IsOptional()
  @IsString()
  locationCodeOut?: string;

  @ApiProperty({ description: 'Reservation statuses', required: false, isArray: true, enum: ReservationStatus })
  @IsOptional()
  @IsArray()
  @IsEnum(ReservationStatus, { each: true })
  reservationStatus?: ReservationStatus[];

  @ApiProperty({ description: 'Filter by date from', required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ description: 'Filter by date to', required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ description: 'Sort by field', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ description: 'Sort order', required: false, default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
