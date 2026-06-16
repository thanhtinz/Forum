import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── ADMIN ──
  @Get('admin/topups')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminTopups(@Query('status') status?: string, @Query('page') page = 1) {
    return this.paymentsService.adminTopups(status, Number(page));
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminStats() { return this.paymentsService.adminTopupStats(); }

  // SePay
  @Post('sepay/topup')
  @UseGuards(JwtAuthGuard)
  createSepayTopup(
    @CurrentUser('id') userId: string,
    @Body('packageId') packageId: string,
  ) {
    return this.paymentsService.createSepayTopup(userId, packageId);
  }

  @Post('sepay/webhook')
  handleSepayWebhook(
    @Body() payload: any,
    @Headers('authorization') auth: string,
  ) {
    const apiKey = auth?.replace('Apikey ', '').replace('Bearer ', '') ?? '';
    return this.paymentsService.handleSepayWebhook(payload, apiKey);
  }

  // PayPal
  @Post('paypal/order')
  @UseGuards(JwtAuthGuard)
  createPaypalOrder(
    @CurrentUser('id') userId: string,
    @Body('packageId') packageId: string,
  ) {
    return this.paymentsService.createPaypalOrder(userId, packageId);
  }

  @Post('paypal/capture/:orderId')
  @UseGuards(JwtAuthGuard)
  capturePaypalOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.capturePaypalOrder(orderId);
  }
}
