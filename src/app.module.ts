import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HiddenContentModule } from './modules/hidden-content/hidden-content.module';
import { ForumModule } from './modules/forum/forum.module';
import { PagesModule } from './modules/pages/pages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GemModule } from './modules/gem/gem.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiCompanionModule } from './modules/ai-companion/ai-companion.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { GameModule } from './modules/game/game.module';
import { MinigameModule } from './modules/minigame/minigame.module';
import { ChatModule } from './modules/chat/chat.module';
import { ToolsModule } from './modules/tools/tools.module';
import { FortuneModule } from './modules/fortune/fortune.module';
import { SeederModule } from './seed/seeder.module';
import { SocialModule } from './modules/social/social.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { ProfileExtraModule } from './modules/profile-extra/profile-extra.module';
import { CommunityModule } from './modules/community/community.module';
import { BadgesModule } from './modules/badges/badge.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    // Phục vụ file upload local (ảnh người dùng tải lên) tại /uploads.
    // Đăng ký TRƯỚC ServeStatic frontend để không bị nuốt route.
    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    // Phục vụ frontend Next.js (static export) cùng origin với API -> deploy 1 process.
    // Bỏ qua /api để không nuốt route backend. extensions:['html'] để /thread -> thread.html.
    ServeStaticModule.forRoot({
      rootPath: process.env.FRONTEND_DIST || join(process.cwd(), 'frontend', 'out'),
      exclude: ['/api*'],
      serveStaticOptions: { extensions: ['html'] },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ForumModule,
    PagesModule,
    HiddenContentModule,
    NotificationsModule,
    GemModule,
    MarketplaceModule,
    PaymentsModule,
    AiCompanionModule,
    ModerationModule,
    ReputationModule,
    MediaModule,
    SearchModule,
    AdminModule,
    GameModule,
    MinigameModule,
    ChatModule,
    ToolsModule,
    FortuneModule,
    SeederModule,
    SocialModule,
    GalleryModule,
    ProfileExtraModule,
    CommunityModule,
    BadgesModule,
  ],
})
export class AppModule {}
