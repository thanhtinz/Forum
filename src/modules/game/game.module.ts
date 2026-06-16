import { Module } from '@nestjs/common';
import { CharacterService } from './character/character.service';
import { SurvivalService } from './character/survival.service';
import { CombatService } from './combat/combat.service';
import { ShopService } from './shop/shop.service';
import { SpecialItemService } from './shop/special-item.service';
import { GuildService } from './guild/guild.service';
import { FishingService } from './fishing/fishing.service';
import { FarmService } from './farm/farm.service';
import { GameController } from './game.controller';
import { FishingController } from './fishing/fishing.controller';
import { FarmController } from './farm/farm.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  controllers: [GameController, FishingController, FarmController],
  providers: [CharacterService, SurvivalService, CombatService, ShopService, SpecialItemService, GuildService, FishingService, FarmService],
  exports: [CharacterService],
})
export class GameModule {}
