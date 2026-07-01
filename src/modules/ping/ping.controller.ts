import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PingService, PingScope } from './ping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('ping')
@UseGuards(JwtAuthGuard)
export class PingController {
  constructor(private readonly ping: PingService) {}

  @Post()
  send(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { scope: PingScope; link: string; title?: string; body?: string; userIds?: string[] },
  ) {
    return this.ping.ping(userId, role, body);
  }
}
