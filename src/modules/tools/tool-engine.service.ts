import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService } from '../ai-companion/ai-provider.service';

// Engine chạy ở SERVER. 2 loại: pure (đồng bộ) và ai (gọi LLM).
type PureFn = (input: string) => string;

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');

const PURE: Record<string, PureFn> = {
  'json-format': (i) => JSON.stringify(JSON.parse(i), null, 2),
  'json-minify': (i) => JSON.stringify(JSON.parse(i)),
  'base64-encode': (i) => b64(i),
  'base64-decode': (i) => unb64(i.trim()),
  'url-encode': (i) => encodeURIComponent(i),
  'url-decode': (i) => decodeURIComponent(i),
  'hash-all': (i) => ['md5', 'sha1', 'sha256', 'sha512']
    .map((a) => `${a.toUpperCase().padEnd(7)}: ${createHash(a).update(i).digest('hex')}`).join('\n'),
  'uuid': () => Array.from({ length: 5 }, () => randomUUID()).join('\n'),
  'jwt-decode': (i) => {
    const [h, p] = i.trim().split('.');
    if (!h || !p) throw new Error('Token JWT không hợp lệ');
    const dec = (s: string) => JSON.stringify(JSON.parse(unb64(s.replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
    return `HEADER:\n${dec(h)}\n\nPAYLOAD:\n${dec(p)}`;
  },
  'slugify': (i) => i.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  'text-stats': (i) => {
    const chars = i.length, words = i.trim() ? i.trim().split(/\s+/).length : 0;
    const lines = i ? i.split(/\n/).length : 0, bytes = Buffer.byteLength(i, 'utf8');
    return `Ký tự: ${chars}\nTừ: ${words}\nDòng: ${lines}\nByte (UTF-8): ${bytes}`;
  },
};

// AI tools: { engineKey: { system, label } }
const AI_TOOLS: Record<string, string> = {
  'ai-explain-code': 'Bạn là chuyên gia lập trình. Giải thích đoạn code người dùng gửi bằng tiếng Việt: mục đích tổng quát, luồng hoạt động từng phần, và lưu ý nếu có. Ngắn gọn, rõ ràng.',
  'ai-regex': 'Bạn là chuyên gia regex. Người dùng mô tả nhu cầu khớp chuỗi bằng tiếng Việt. Hãy trả về: 1) biểu thức regex (trong khối code), 2) giải thích từng phần, 3) ví dụ khớp/không khớp.',
  'ai-commit': 'Bạn viết commit message theo chuẩn Conventional Commits. Dựa trên mô tả thay đổi (hoặc diff) người dùng gửi, trả về 1 dòng tiêu đề commit + (nếu cần) phần thân ngắn gọn bằng tiếng Anh.',
  'ai-translate': 'Bạn là dịch giả. Tự nhận diện ngôn ngữ đầu vào: nếu là tiếng Việt thì dịch sang tiếng Anh tự nhiên, ngược lại dịch sang tiếng Việt. Chỉ trả về bản dịch.',
  'ai-sql': 'Bạn là chuyên gia SQL. Người dùng mô tả truy vấn cần làm bằng tiếng Việt. Trả về câu lệnh SQL (PostgreSQL) trong khối code kèm giải thích ngắn.',
  'ai-name': 'Bạn giúp đặt tên biến/hàm theo chuẩn lập trình. Dựa trên mô tả người dùng, gợi ý 5-8 tên (camelCase) kèm giải thích ngắn mỗi tên.',
  'ai-explain-error': 'Bạn là chuyên gia debug. Người dùng dán thông báo lỗi/stack trace. Giải thích nguyên nhân thường gặp và cách khắc phục bằng tiếng Việt, có bước cụ thể.',
};

@Injectable()
export class ToolEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProviderService,
  ) {}

  isServerEngine(key?: string | null): boolean {
    return !!key && (key in PURE || key in AI_TOOLS);
  }

  private async pickModel(): Promise<{ provider: AiProvider; modelId: string }> {
    const persona = await this.prisma.aiPersona.findFirst({ where: { isDefault: true } });
    if (persona) return { provider: persona.provider, modelId: persona.modelId };
    return { provider: 'GEMINI' as AiProvider, modelId: 'gemini-2.0-flash' };
  }

  async run(engineKey: string, input: string): Promise<string> {
    const text = (input ?? '').toString();
    if (PURE[engineKey]) {
      if (!text.trim() && engineKey !== 'uuid') throw new BadRequestException('Nhập dữ liệu đầu vào');
      try { return PURE[engineKey](text); }
      catch (e: any) { throw new BadRequestException('Lỗi xử lý: ' + (e?.message || 'dữ liệu không hợp lệ')); }
    }
    if (AI_TOOLS[engineKey]) {
      if (!text.trim()) throw new BadRequestException('Nhập nội dung');
      const { provider, modelId } = await this.pickModel();
      const out = await this.ai.complete(provider, modelId, [
        { role: 'system', content: AI_TOOLS[engineKey] },
        { role: 'user', content: text.slice(0, 8000) },
      ]);
      if (!out?.trim()) throw new BadRequestException('AI chưa được cấu hình hoặc không phản hồi');
      return out;
    }
    throw new BadRequestException('Công cụ không hỗ trợ chạy ở server');
  }
}
