import { Module } from '@nestjs/common';
import { GemModule } from '../gem/gem.module';
import { GamePortalController } from './game-portal.controller';
import { GamePortalService } from './game-portal.service';

@Module({
  imports: [GemModule],
  controllers: [GamePortalController],
  providers: [GamePortalService],
})
export class GamePortalModule {}
