import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiCompanionService } from './ai-companion.service';
import { AiCompanionController } from './ai-companion.controller';
import { AiProviderService } from './ai-provider.service';
import { EmotionService } from './emotion.service';
import { AiGateway } from './ai.gateway';
import { OutfitService } from './outfit.service';
import { AiWritingService } from './ai-writing.service';
import { AiWritingController } from './ai-writing.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AiCompanionController, AiWritingController],
  providers: [AiCompanionService, AiProviderService, EmotionService, AiGateway, OutfitService, AiWritingService],
  exports: [AiCompanionService, OutfitService, AiProviderService],
})
export class AiCompanionModule {}
