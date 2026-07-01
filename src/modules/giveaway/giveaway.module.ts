import { Module } from '@nestjs/common';
import { GiveawayService } from './giveaway.service';
import { GiveawayController } from './giveaway.controller';
import { GameModule } from '../game/game.module';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GameModule, GemModule],
  controllers: [GiveawayController],
  providers: [GiveawayService],
  exports: [GiveawayService],
})
export class GiveawayModule {}
