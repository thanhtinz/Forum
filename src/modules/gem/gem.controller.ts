import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GemService } from './gem.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('gem')
export class GemController {
  constructor(private readonly gemService: GemService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@CurrentUser('id') userId: string) {
    return this.gemService.getBalance(userId).then((balance) => ({ balance }));
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getWallet(@CurrentUser('id') userId: string) {
    return this.gemService.getWallet(userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.gemService.getTransactions(userId, Number(page), Number(limit));
  }

  @Get('packages')
  getPackages() {
    return this.gemService.getPackages();
  }
}
