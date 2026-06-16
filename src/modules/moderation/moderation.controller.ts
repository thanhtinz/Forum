import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateReportDto, CreateScamReportDto } from './moderation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  createReport(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(userId, dto);
  }

  @Post('scam-reports')
  createScamReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScamReportDto,
  ) {
    return this.moderation.createScamReport(userId, dto);
  }

  @Get('reports/mine')
  myReports(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.moderation.myReports(userId, Number(page), Number(limit));
  }
}
