import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { GemModule } from '../gem/gem.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GemModule, NotificationsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
