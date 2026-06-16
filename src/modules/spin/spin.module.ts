import { Module } from '@nestjs/common';
import { SpinService } from './spin.service';
import { SpinController } from './spin.controller';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  controllers: [SpinController],
  providers: [SpinService],
  exports: [SpinService],
})
export class SpinModule {}
