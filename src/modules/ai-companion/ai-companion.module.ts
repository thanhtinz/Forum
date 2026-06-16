import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiCompanionService } from './ai-companion.service';
import { AiCompanionController } from './ai-companion.controller';
import { AiProviderService } from './ai-provider.service';
import { EmotionService } from './emotion.service';
import { AiGateway } from './ai.gateway';
import { OutfitService } from './outfit.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AiCompanionController],
  providers: [AiCompanionService, AiProviderService, EmotionService, AiGateway, OutfitService],
  exports: [AiCompanionService, OutfitService],
})
export class AiCompanionModule {}
