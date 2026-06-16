import { Module } from '@nestjs/common';
import { FortuneService } from './fortune.service';
import { FortuneController } from './fortune.controller';
import { AiProviderService } from '../ai-companion/ai-provider.service';

@Module({
  providers: [FortuneService, AiProviderService],
  controllers: [FortuneController],
  exports: [FortuneService],
})
export class FortuneModule {}
