import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { TriviaService } from './trivia.service';
import { PredictionService } from './prediction.service';
import { PredictionSchedulerService } from './prediction-scheduler.service';
import { GameModule } from '../game/game.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GameModule, NotificationsModule],
  controllers: [QuizController],
  providers: [TriviaService, PredictionService, PredictionSchedulerService],
  exports: [TriviaService, PredictionService],
})
export class QuizModule {}
