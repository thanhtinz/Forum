import { Module } from '@nestjs/common';
import { FortuneService } from './fortune.service';
import { FortuneController } from './fortune.controller';
import { AiCompanionModule } from '../ai-companion/ai-companion.module';

@Module({
  imports: [AiCompanionModule],
  providers: [FortuneService],
  controllers: [FortuneController],
  exports: [FortuneService],
})
export class FortuneModule {}
