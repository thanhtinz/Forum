import { Global, Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { SecurityController } from './security.controller';
import { SeoController } from './seo.controller';

@Global()
@Module({
  providers: [CaptchaService],
  controllers: [SecurityController, SeoController],
  exports: [CaptchaService],
})
export class SecurityModule {}
