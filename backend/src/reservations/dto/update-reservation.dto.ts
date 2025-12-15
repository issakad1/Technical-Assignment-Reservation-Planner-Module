import { ApiProperty } from '@nestjs/swagger';
import { 
  IsDateString, 
  IsOptional, 
  IsString, 
  IsInt,
  Min,
  IsEnum
} from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationDto {
  @ApiProperty({ description: 'Pickup date and time', required: false })
  @IsOptional()
  @IsDateString()
  dateOut?: string;

  @ApiProperty({ description: 'Return date and time', required: false })
  @IsOptional()
  @IsDateString()
  dateDue?: string;

  @ApiProperty({ description: 'Pickup location code', required: false })
  @IsOptional()
  @IsString()
  locationCodeOut?: string;

  @ApiProperty({ description: 'Dropoff location code', required: false })
  @IsOptional()
  @IsString()
  locationCodeDue?: string;

  @ApiProperty({ description: 'Vehicle Class ID', required: false })
  @IsOptional()
  @IsInt()
  vehicleClassId?: number;

  @ApiProperty({ description: 'Rate code', required: false })
  @IsOptional()
  @IsString()
  rateCode?: string;

  @ApiProperty({ description: 'Estimated miles', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMiles?: number;

  @ApiProperty({ description: 'Internal notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Customer-facing notes', required: false })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({ description: 'Reservation status', required: false, enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  reservationStatus?: ReservationStatus;

  @ApiProperty({ description: 'Modified by user', required: false })
  @IsOptional()
  @IsString()
  modifiedBy?: string;
}
