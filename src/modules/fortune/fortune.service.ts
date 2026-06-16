import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeBazi, BaziInput } from './engines/bazi.engine';
import { drawTarot } from './engines/tarot.engine';
import { computeMeihua, MeihuaInput } from './engines/meihua.engine';

@Injectable()
export class FortuneService {
  constructor(private readonly prisma: PrismaService) {}

  async bazi(input: BaziInput, userId?: string) {
    const { year, month, day, hour } = input;
    if (!year || year < 1900 || year > 2100) throw new BadRequestException('Năm sinh không hợp lệ (1900-2100)');
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23) {
      throw new BadRequestException('Ngày/giờ sinh không hợp lệ');
    }
    const result = computeBazi(input);
    await this.save('BAZI', input, result, undefined, userId);
    return result;
  }

  async tarot(n: number, question: string | undefined, userId?: string) {
    const cards = drawTarot(n);
    const result = { question: question ?? null, cards };
    await this.save('TAROT', { n }, result, question, userId);
    return result;
  }

  async meihua(input: MeihuaInput, userId?: string) {
    const result = computeMeihua(input);
    await this.save('MEIHUA', input, result, input.question, userId);
    return result;
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

  private async save(type: string, input: unknown, result: unknown, question?: string, userId?: string) {
    if (!userId) return; // chỉ lưu khi đã đăng nhập
    try {
      await this.prisma.fortuneRecord.create({
        data: {
          userId, type, question: question ?? null,
          input: input as Prisma.InputJsonValue,
          result: result as Prisma.InputJsonValue,
        },
      });
    } catch { /* không chặn kết quả nếu lưu lỗi */ }
  }
}
