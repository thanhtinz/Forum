import { Module } from '@nestjs/common';
import { ProfileExtraController } from './profile-extra.controller';
import { BlockService } from './block.service';
import { ProfileFieldService } from './profile-field.service';

// PrismaModule is @Global, so PrismaService is injectable without re-providing.
@Module({
  controllers: [ProfileExtraController],
  providers: [BlockService, ProfileFieldService],
  exports: [BlockService, ProfileFieldService],
})
export class ProfileExtraModule {}
