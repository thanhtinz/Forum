import { Module, Global } from '@nestjs/common';
import { TrophyService } from './trophy.service';
import { TrophyController } from './trophy.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [TrophyController],
  providers: [TrophyService],
  exports: [TrophyService],
})
export class ReputationModule {}
