import { Module } from '@nestjs/common';
import { CheckInService } from './checkin.service';
import { CheckInController } from './checkin.controller';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService],
})
export class CheckInModule {}
