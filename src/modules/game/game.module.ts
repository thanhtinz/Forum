import { Module } from '@nestjs/common';
import { CharacterService } from './character/character.service';
import { SurvivalService } from './character/survival.service';
import { CombatService } from './combat/combat.service';
import { ShopService } from './shop/shop.service';
import { SpecialItemService } from './shop/special-item.service';
import { GuildService } from './guild/guild.service';
import { FishingService } from './fishing/fishing.service';
import { GameController } from './game.controller';
import { FishingController } from './fishing/fishing.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  controllers: [GameController, FishingController],
  providers: [CharacterService, SurvivalService, CombatService, ShopService, SpecialItemService, GuildService, FishingService],
  exports: [CharacterService],
})
export class GameModule {}
