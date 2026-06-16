import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { TriviaService } from './trivia.service';
import { PredictionService } from './prediction.service';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  controllers: [QuizController],
  providers: [TriviaService, PredictionService],
  exports: [TriviaService, PredictionService],
})
export class QuizModule {}
