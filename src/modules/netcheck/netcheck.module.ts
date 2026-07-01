import { Module } from '@nestjs/common';
import { NetcheckService } from './netcheck.service';
import { NetcheckController } from './netcheck.controller';

@Module({
  providers: [NetcheckService],
  controllers: [NetcheckController],
})
export class NetcheckModule {}
