import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MinigameService } from './minigame.service';
import { MinigameController } from './minigame.controller';
import { RoomService } from './room.service';
import { MinigameGateway } from './minigame.gateway';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MinigameController],
  providers: [MinigameService, RoomService, MinigameGateway],
  exports: [MinigameService, RoomService],
})
export class MinigameModule {}
