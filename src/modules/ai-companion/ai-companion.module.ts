import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiWritingService } from './ai-writing.service';
import { AiWritingController } from './ai-writing.controller';

// Tính năng "AI companion" (chat Live2D, bond, outfit) đã gỡ bỏ.
// Module này chỉ còn giữ tiện ích AI dùng chung: nhà cung cấp AI + trợ lý viết bài
// (dùng bởi diễn đàn, công cụ, bói toán…).
@Module({
  controllers: [AiWritingController],
  providers: [AiProviderService, AiWritingService],
  exports: [AiProviderService],
})
export class AiCompanionModule {}
