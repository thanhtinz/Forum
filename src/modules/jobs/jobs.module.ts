import { Module } from '@nestjs/common';
import { GemModule } from '../gem/gem.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiCompanionModule } from '../ai-companion/ai-companion.module';
import { JobsService } from './jobs.service';
import { FreelancerService } from './freelancer.service';
import { JobsAiService } from './jobs-ai.service';
import { JobsController } from './jobs.controller';
import { FreelancersController } from './freelancers.controller';

@Module({
  imports: [GemModule, NotificationsModule, AiCompanionModule],
  providers: [JobsService, FreelancerService, JobsAiService],
  controllers: [JobsController, FreelancersController],
})
export class JobsModule {}
