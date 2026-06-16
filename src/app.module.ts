import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { HiddenContentModule } from './modules/hidden-content/hidden-content.module';
import { ForumModule } from './modules/forum/forum.module';
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
import { SeederModule } from './seed/seeder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ForumModule,
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
    SeederModule,
  ],
})
export class AppModule {}
