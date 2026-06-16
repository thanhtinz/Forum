import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Param,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
