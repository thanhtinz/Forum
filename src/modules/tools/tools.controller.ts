import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list() {
    return this.tools.list();
  }

  @Get('popular')
  popular(@Query('limit') limit = 10) {
    return this.tools.popular(Number(limit));
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.tools.getBySlug(slug);
  }

  @Post(':slug/use')
  use(@Param('slug') slug: string) {
    return this.tools.use(slug);
  }
}
