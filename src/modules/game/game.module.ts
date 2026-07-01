import { Module } from '@nestjs/common';
import { CharacterService } from './character/character.service';
import { GuildService } from './guild/guild.service';
import { FarmService } from './farm/farm.service';
import { GameController } from './game.controller';
import { FarmController } from './farm/farm.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  controllers: [GameController, FarmController],
  providers: [CharacterService, GuildService, FarmService],
  exports: [CharacterService],
})
export class GameModule {}
