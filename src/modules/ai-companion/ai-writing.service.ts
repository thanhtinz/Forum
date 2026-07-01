import { BadRequestException, Injectable } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService } from './ai-provider.service';
import { AdminConfigService } from '../admin/admin-config.service';

const MAX_LEN = 6000;

@Injectable()
export class AiWritingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly config: AdminConfigService,
  ) {}

  private async pickModel(): Promise<{ provider: AiProvider; modelId: string }> {
    // Ưu tiên cấu hình AI hệ thống (admin → Cấu hình → AI hệ thống)
    const provider = await this.config.resolve<string>('ai.defaultProvider', undefined, '');
    const modelId = await this.config.resolve<string>('ai.defaultModel', undefined, '');
    if (provider && modelId) return { provider: provider as AiProvider, modelId };
    const persona = await this.prisma.aiPersona.findFirst({ where: { isDefault: true } });
    if (persona) return { provider: persona.provider, modelId: persona.modelId };
    return { provider: 'GEMINI' as AiProvider, modelId: 'gemini-2.0-flash' };
  }

  private clean(text: string): string {
    const t = (text ?? '').trim();
    if (!t) throw new BadRequestException('Nội dung trống');
    return t.slice(0, MAX_LEN);
  }

  private async run(systemPrompt: string, userContent: string): Promise<string> {
    const { provider, modelId } = await this.pickModel();
    return this.aiProvider.complete(provider, modelId, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]);
  }

  async rewrite(text: string, tone?: string): Promise<string> {
    const content = this.clean(text);
    const toneStr = tone ? ` với giọng văn ${tone}` : '';
    return this.run(
      `Viết lại đoạn văn sau cho mạch lạc, giữ nguyên ý${toneStr}. Chỉ trả về văn bản đã viết lại.`,
      content,
    );
  }

  async translate(text: string, target = 'Tiếng Anh'): Promise<string> {
    const content = this.clean(text);
    return this.run(`Dịch sang ${target}. Chỉ trả về bản dịch.`, content);
  }

  async summarize(text: string): Promise<string> {
    const content = this.clean(text);
    return this.run('Tóm tắt ngắn gọn nội dung sau bằng tiếng Việt.', content);
  }

  async grammar(text: string): Promise<string> {
    const content = this.clean(text);
    return this.run(
      'Sửa lỗi chính tả & ngữ pháp tiếng Việt, giữ nguyên ý. Chỉ trả về văn bản đã sửa.',
      content,
    );
  }

  async title(text: string): Promise<string> {
    const content = this.clean(text);
    const out = await this.run(
      'Đề xuất 1 tiêu đề ngắn, hấp dẫn (tiếng Việt) cho nội dung sau. Chỉ trả về tiêu đề, không dấu ngoặc.',
      content,
    );
    return out.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  }

  async tags(text: string): Promise<string[]> {
    const content = this.clean(text);
    const out = await this.run(
      'Đề xuất 3-6 thẻ (tag) ngắn cho nội dung, phân tách bằng dấu phẩy. Chỉ trả về danh sách.',
      content,
    );
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const raw of out.split(',')) {
      const t = raw.replace(/^[#\-\s]+|[\s]+$/g, '').trim();
      const key = t.toLowerCase();
      if (t && !seen.has(key)) {
        seen.add(key);
        tags.push(t);
      }
    }
    return tags;
  }

  async continueWriting(text: string): Promise<string> {
    const content = this.clean(text);
    return this.run(
      'Viết tiếp đoạn văn sau một cách tự nhiên (tiếng Việt). Chỉ trả về phần viết thêm.',
      content,
    );
  }

  async pollFromContent(text: string): Promise<{ question: string; options: string[] }> {
    const content = this.clean(text);
    const out = await this.run(
      'Dựa trên nội dung sau, tạo một cuộc bình chọn (poll) liên quan. ' +
        'Chỉ trả về JSON đúng định dạng: {"question":"...","options":["...","..."]} với 2-5 lựa chọn ngắn gọn bằng tiếng Việt.',
      content,
    );
    return this.parsePoll(out);
  }

  private parsePoll(raw: string): { question: string; options: string[] } {
    let question = '';
    let options: string[] = [];
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const json = JSON.parse(raw.slice(start, end + 1));
        if (typeof json.question === 'string') question = json.question.trim();
        if (Array.isArray(json.options)) {
          options = json.options
            .map((o: unknown) => String(o).trim())
            .filter((o: string) => o.length > 0);
        }
      } catch {
        // ignore, return empty
      }
    }
    return { question, options };
  }
}
