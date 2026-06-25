import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HiddenContentModule } from './modules/hidden-content/hidden-content.module';
import { ForumModule } from './modules/forum/forum.module';
import { PagesModule } from './modules/pages/pages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GemModule } from './modules/gem/gem.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiCompanionModule } from './modules/ai-companion/ai-companion.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ScamModule } from './modules/scam/scam.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { GameModule } from './modules/game/game.module';
import { MinigameModule } from './modules/minigame/minigame.module';
import { ChatModule } from './modules/chat/chat.module';
import { ToolsModule } from './modules/tools/tools.module';
import { ImgHostModule } from './modules/imghost/imghost.module';
import { NetcheckModule } from './modules/netcheck/netcheck.module';
import { FortuneModule } from './modules/fortune/fortune.module';
import { GiftcodeModule } from './modules/giftcode/giftcode.module';
import { SeederModule } from './seed/seeder.module';
import { SocialModule } from './modules/social/social.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { ProfileExtraModule } from './modules/profile-extra/profile-extra.module';
import { CommunityModule } from './modules/community/community.module';
import { CheckInModule } from './modules/checkin/checkin.module';
import { GiveawayModule } from './modules/giveaway/giveaway.module';
import { MailModule } from './modules/mail/mail.module';
import { SecurityModule } from './modules/security/security.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { BadgesModule } from './modules/badges/badge.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AvatarFrameModule } from './modules/avatar-frame/avatar-frame.module';
import { CosmeticsModule } from './modules/cosmetics/cosmetics.module';
import { AnimeModule } from './modules/anime/anime.module';
import { MarketModule } from './modules/market/market.module';
import { PingModule } from './modules/ping/ping.module';
import { BannerModule } from './modules/banner/banner.module';
import { MangaCreatorModule } from './modules/manga-creator/manga-creator.module';
import { RssModule } from './modules/rss/rss.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Giới hạn tần suất request (chống spam/brute-force): 120 req / 60s / IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
      // Các route này do SeoHtmlController phục vụ (chèn meta động cho mạng xã hội).
      exclude: ['/api*', '/thread', '/profile', '/tag', '/p'],
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
    AvatarFrameModule,
    CosmeticsModule,
    AnimeModule,
    MarketModule,
    PingModule,
    BannerModule,
    PaymentsModule,
    AiCompanionModule,
    ModerationModule,
    ConversationModule,
    ScamModule,
    ReputationModule,
    MediaModule,
    SearchModule,
    AdminModule,
    GameModule,
    MinigameModule,
    ChatModule,
    ToolsModule,
    ImgHostModule,
    NetcheckModule,
    FortuneModule,
    GiftcodeModule,
    SeederModule,
    SocialModule,
    GalleryModule,
    ProfileExtraModule,
    CommunityModule,
    BadgesModule,
    VerificationModule,
    CheckInModule,
    GiveawayModule,
    MailModule,
    SecurityModule,
    PermissionsModule,
    MangaCreatorModule,
    RssModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
