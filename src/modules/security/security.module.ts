import { Global, Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { SecurityController } from './security.controller';
import { SeoController } from './seo.controller';
import { SeoHtmlController } from './seo-html.controller';

@Global()
@Module({
  providers: [CaptchaService],
  controllers: [SecurityController, SeoController, SeoHtmlController],
  exports: [CaptchaService],
})
export class SecurityModule {}
