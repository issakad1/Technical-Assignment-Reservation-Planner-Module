import { ApiProperty } from '@nestjs/swagger';
import { 
  IsInt, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsNumber,
  Min,
  IsEnum
} from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class CreateReservationDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsInt()
  customerId: number;

  @ApiProperty({ description: 'Vehicle Class ID' })
  @IsInt()
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

  @ApiProperty({ description: 'Rate code' })
  @IsString()
  rateCode: string;

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

  @ApiProperty({ description: 'Created by user', required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
