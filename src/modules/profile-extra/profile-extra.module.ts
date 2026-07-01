import { Module } from '@nestjs/common';
import { ProfileExtraController } from './profile-extra.controller';
import { BlockService } from './block.service';

// PrismaModule is @Global, so PrismaService is injectable without re-providing.
@Module({
  controllers: [ProfileExtraController],
  providers: [BlockService],
  exports: [BlockService],
})
export class ProfileExtraModule {}
