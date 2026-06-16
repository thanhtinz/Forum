import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
