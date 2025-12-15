import { Controller, Get, Post, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AiService } from './ai.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly aiService: AiService,
  ) {}

  @Get('utilization')
  @ApiOperation({ summary: 'Get vehicle class utilization rates' })
  getVehicleClassUtilization() {
    return this.analyticsService.getVehicleClassUtilization();
  }

  @Post('ai/auto-assign')
  @ApiOperation({ summary: 'AI-powered automatic vehicle assignment' })
  async autoAssignVehicles(@Query('locationCode') locationCode?: string) {
    return this.aiService.autoAssignVehicles(locationCode);
  }

  @Get('ai/recommendations/:reservationId')
  @ApiOperation({ summary: 'Get AI recommendations for a reservation' })
  async getRecommendations(@Param('reservationId', ParseIntPipe) reservationId: number) {
    return this.aiService.getAssignmentRecommendations(reservationId);
  }

  @Get('fleet-utilization')
  @ApiOperation({ summary: 'Get fleet utilization analytics' })
  async getFleetUtilization(
    @Query('locationCode') locationCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiService.getFleetUtilization(
      locationCode,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}