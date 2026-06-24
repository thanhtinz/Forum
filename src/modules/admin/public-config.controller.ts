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
      'site.primaryColor', 'site.heroTitle', 'site.heroDescription', 'site.footerText', 'site.contactEmail',
    ]);
    return {
      name: c['site.name'] ?? process.env.SITE_NAME ?? 'Trạm GenZ',
      tagline: c['site.tagline'] ?? '',
      description: c['site.description'] ?? '',
      contactEmail: c['site.contactEmail'] ?? '',
      logo: c['site.logo'] ?? '',
      logoSmall: c['site.logoSmall'] ?? '',
      favicon: c['site.favicon'] ?? '',
      primaryColor: c['site.primaryColor'] ?? '',
      heroTitle: c['site.heroTitle'] ?? 'Chào mừng đến Trạm GenZ',
      heroDescription: c['site.heroDescription'] ?? 'Cộng đồng anime & manga — xem hoạt hình, đọc truyện, thảo luận cùng bạn bè.',
      footerText: c['site.footerText'] ?? '© {year} Trạm GenZ',
    };
  }
}
