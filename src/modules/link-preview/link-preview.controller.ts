import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';

@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly svc: LinkPreviewService) {}

  @Get()
  preview(@Query('url') url: string) {
    if (!url) throw new BadRequestException('Thiếu tham số url');
    return this.svc.preview(url);
  }
}
