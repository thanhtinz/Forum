import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { TriviaService } from './trivia.service';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  controllers: [QuizController],
  providers: [TriviaService],
  exports: [TriviaService],
})
export class QuizModule {}
