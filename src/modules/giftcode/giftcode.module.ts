import { Module } from '@nestjs/common';
import { GiftcodeController } from './giftcode.controller';
import { GiftcodeService } from './giftcode.service';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  controllers: [GiftcodeController],
  providers: [GiftcodeService],
})
export class GiftcodeModule {}
