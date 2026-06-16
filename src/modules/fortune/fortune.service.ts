import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService, AiChatMessage } from '../ai-companion/ai-provider.service';
import { computeBazi, BaziInput } from './engines/bazi.engine';
import { drawTarot } from './engines/tarot.engine';
import { computeMeihua, MeihuaInput } from './engines/meihua.engine';

const CONFIG_KEY = 'fortune';

export interface FortuneConfig {
  priceBazi: number;
  priceTarot: number;
  priceMeihua: number;
  aiEnabled: boolean;
  aiPrice: number;            // phí phân tích AI
  aiProvider: 'OPENAI' | 'GEMINI' | 'OLLAMA';
  aiModel: string;
  aiSystemPrompt: string;
}

const DEFAULT_CONFIG: FortuneConfig = {
  priceBazi: 0,
  priceTarot: 0,
  priceMeihua: 0,
  aiEnabled: false,
  aiPrice: 0,
  aiProvider: 'GEMINI',
  aiModel: 'gemini-1.5-flash',
  aiSystemPrompt:
    'Bạn là một chuyên gia luận giải mệnh lý người Việt. Hãy phân tích kết quả dưới đây một cách súc tích, dễ hiểu, tích cực và có lời khuyên thực tế. Trả lời bằng tiếng Việt.',
};

@Injectable()
export class FortuneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProviderService,
  ) {}

  // ── Config (lưu trong SiteConfig) ──
  async getConfig(): Promise<FortuneConfig> {
    const row = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } });
    return { ...DEFAULT_CONFIG, ...((row?.value as object) ?? {}) };
  }

  // chỉ lộ phần công khai cho client (giá + bật AI)
  async getPublicConfig() {
    const c = await this.getConfig();
    return {
      priceBazi: c.priceBazi, priceTarot: c.priceTarot, priceMeihua: c.priceMeihua,
      aiEnabled: c.aiEnabled, aiPrice: c.aiPrice,
    };
  }

  async setConfig(patch: Partial<FortuneConfig>) {
    const current = await this.getConfig();
    const next = { ...current, ...patch };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: next as Prisma.InputJsonValue },
      create: { key: CONFIG_KEY, value: next as Prisma.InputJsonValue },
    });
    return next;
  }

  async stats() {
    const [total, byType] = await Promise.all([
      this.prisma.fortuneRecord.count(),
      this.prisma.fortuneRecord.groupBy({ by: ['type'], _count: { _all: true } }),
    ]);
    return { total, byType: byType.map((b) => ({ type: b.type, count: b._count._all })) };
  }

  // ── Bói (thu phí coin mỗi lần xem) ──
  async bazi(input: BaziInput, userId?: string) {
    const { year, month, day, hour } = input;
    if (!year || year < 1900 || year > 2100) throw new BadRequestException('Năm sinh không hợp lệ (1900-2100)');
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23) {
      throw new BadRequestException('Ngày/giờ sinh không hợp lệ');
    }
    const cfg = await this.getConfig();
    await this.charge(userId, cfg.priceBazi, 'fortune_bazi', 'Xem Bát Tự');
    const result = computeBazi(input);
    await this.save('BAZI', input, result, undefined, userId);
    return result;
  }

  async tarot(n: number, question: string | undefined, userId?: string) {
    const cfg = await this.getConfig();
    await this.charge(userId, cfg.priceTarot, 'fortune_tarot', 'Bốc Tarot');
    const cards = drawTarot(n);
    const result = { question: question ?? null, cards };
    await this.save('TAROT', { n }, result, question, userId);
    return result;
  }

  async meihua(input: MeihuaInput, userId?: string) {
    const cfg = await this.getConfig();
    await this.charge(userId, cfg.priceMeihua, 'fortune_meihua', 'Lập quẻ Mai Hoa');
    const result = computeMeihua(input);
    await this.save('MEIHUA', input, result, input.question, userId);
    return result;
  }

  // ── Phân tích AI (admin cấu hình provider/model/prompt) ──
  async analyze(type: string, result: unknown, question: string | undefined, userId?: string) {
    const cfg = await this.getConfig();
    if (!cfg.aiEnabled) throw new BadRequestException('Tính năng phân tích AI đang tắt');
    await this.charge(userId, cfg.aiPrice, 'fortune_ai', 'Phân tích AI mệnh lý');

    const messages: AiChatMessage[] = [
      { role: 'system', content: cfg.aiSystemPrompt },
      {
        role: 'user',
        content:
          `Loại: ${type}\n` +
          (question ? `Câu hỏi: ${question}\n` : '') +
          `Dữ liệu kết quả (JSON):\n${JSON.stringify(result)}\n\nHãy luận giải.`,
      },
    ];

    let text = '';
    try {
      for await (const chunk of this.ai.streamChat(cfg.aiProvider, cfg.aiModel, messages)) {
        text += chunk.text;
      }
    } catch {
      throw new BadRequestException('Không gọi được AI (kiểm tra API key trong cấu hình server)');
    }
    if (!text.trim()) throw new BadRequestException('AI không trả về nội dung (kiểm tra API key/model)');
    return { analysis: text };
  }

  async history(userId: string, type?: string, page = 1, limit = 20) {
    const where: Prisma.FortuneRecordWhereInput = { userId, ...(type ? { type } : {}) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.fortuneRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.fortuneRecord.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── helpers ──
  private async charge(userId: string | undefined, price: number, refId: string, note: string) {
    if (!price || price <= 0) return;
    if (!userId) throw new ForbiddenException('Cần đăng nhập để dùng tính năng trả phí này');
    await this.prisma.$transaction(async (tx) => {
      const char = await tx.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
      if (!char) throw new BadRequestException('Cần nhân vật game để thanh toán coin');
      if (char.coinBalance < price) throw new BadRequestException(`Không đủ coin (cần ${price})`);
      const after = char.coinBalance - price;
      await tx.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: after } });
      await tx.coinTransaction.create({
        data: { characterId: char.id, type: 'spend_fortune', amount: -price, balanceBefore: char.coinBalance, balanceAfter: after, refId, note },
      });
    });
  }

  private async save(type: string, input: unknown, result: unknown, question?: string, userId?: string) {
    if (!userId) return;
    try {
      await this.prisma.fortuneRecord.create({
        data: { userId, type, question: question ?? null, input: input as Prisma.InputJsonValue, result: result as Prisma.InputJsonValue },
      });
    } catch { /* không chặn kết quả */ }
  }
}
