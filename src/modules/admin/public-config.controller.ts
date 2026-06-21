import { Controller, Get } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';

/**
 * Endpoint công khai để frontend đọc các cấu hình site hiển thị cho mọi người
 * (tên, hero trang chủ, footer, logo…). Không cần đăng nhập.
 */
@Controller('site-config')
export class PublicConfigController {
  constructor(private readonly config: AdminConfigService) {}

  @Get()
  async getPublic() {
    const c = await this.config.getMany([
      'site.name', 'site.tagline', 'site.description', 'site.logo', 'site.logoSmall', 'site.favicon',
      'site.primaryColor', 'site.heroTitle', 'site.heroDescription', 'site.footerText',
    ]);
    return {
      name: c['site.name'] ?? 'ForumHub',
      tagline: c['site.tagline'] ?? '',
      description: c['site.description'] ?? '',
      logo: c['site.logo'] ?? '',
      logoSmall: c['site.logoSmall'] ?? '',
      favicon: c['site.favicon'] ?? '',
      primaryColor: c['site.primaryColor'] ?? '',
      heroTitle: c['site.heroTitle'] ?? 'Chào mừng đến ForumHub',
      heroDescription: c['site.heroDescription'] ?? 'Diễn đàn cộng đồng tích hợp game hoá — chia sẻ, thảo luận, chơi game và mua bán source code.',
      footerText: c['site.footerText'] ?? '© {year} ForumHub · NestJS + Next.js',
    };
  }
}
