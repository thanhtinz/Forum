import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MangaCreatorService } from './manga-creator.service';
import { MangaCreatorController } from './manga-creator.controller';

@Module({
  imports: [MediaModule, NotificationsModule],
  controllers: [MangaCreatorController],
  providers: [MangaCreatorService],
})
export class MangaCreatorModule {}
