import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FreelancerService, UpsertFreelancerDto } from './freelancer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('freelancers')
export class FreelancersController {
  constructor(private readonly freelancers: FreelancerService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('skill') skill?: string,
    @Query('country') country?: string,
    @Query('sort') sort?: 'rating' | 'recent',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.freelancers.list({
      q,
      skill,
      country,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('top')
  top(@Query('limit') limit?: string) {
    return this.freelancers.top(limit ? Number(limit) : undefined);
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser('id') userId: string) {
    return this.freelancers.getMine(userId);
  }

  @Post('me/profile')
  @UseGuards(JwtAuthGuard)
  upsertMine(@CurrentUser('id') userId: string, @Body() dto: UpsertFreelancerDto) {
    return this.freelancers.upsertMine(userId, dto);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.freelancers.getByUser(userId);
  }
}
