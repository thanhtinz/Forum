import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiWritingService } from './ai-writing.service';

@Controller('ai/writing')
@UseGuards(JwtAuthGuard)
export class AiWritingController {
  constructor(private readonly writing: AiWritingService) {}

  @Post('rewrite')
  async rewrite(@Body() body: { text: string; tone?: string }) {
    return { result: await this.writing.rewrite(body.text, body.tone) };
  }

  @Post('translate')
  async translate(@Body() body: { text: string; target?: string }) {
    return { result: await this.writing.translate(body.text, body.target) };
  }

  @Post('summarize')
  async summarize(@Body() body: { text: string }) {
    return { result: await this.writing.summarize(body.text) };
  }

  @Post('grammar')
  async grammar(@Body() body: { text: string }) {
    return { result: await this.writing.grammar(body.text) };
  }

  @Post('title')
  async title(@Body() body: { text: string }) {
    return { result: await this.writing.title(body.text) };
  }

  @Post('tags')
  async tags(@Body() body: { text: string }) {
    return { tags: await this.writing.tags(body.text) };
  }

  @Post('continue')
  async continueWriting(@Body() body: { text: string }) {
    return { result: await this.writing.continueWriting(body.text) };
  }

  @Post('poll')
  async poll(@Body() body: { text: string }) {
    return this.writing.pollFromContent(body.text);
  }
}
