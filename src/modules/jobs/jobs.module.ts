import { Module } from '@nestjs/common';
import { GemModule } from '../gem/gem.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsService } from './jobs.service';
import { FreelancerService } from './freelancer.service';
import { JobsController } from './jobs.controller';
import { FreelancersController } from './freelancers.controller';

@Module({
  imports: [GemModule, NotificationsModule],
  providers: [JobsService, FreelancerService],
  controllers: [JobsController, FreelancersController],
})
export class JobsModule {}
