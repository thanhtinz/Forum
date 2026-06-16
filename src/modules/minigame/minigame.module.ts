import { Module } from '@nestjs/common';
import { MinigameService } from './minigame.service';
import { MinigameController } from './minigame.controller';

@Module({
  controllers: [MinigameController],
  providers: [MinigameService],
  exports: [MinigameService],
})
export class MinigameModule {}
