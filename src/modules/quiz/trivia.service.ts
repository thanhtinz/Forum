import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

export interface TriviaDto {
  question: string;
  options: string[];
  correctIndex: number;
  reward: number;
  activeDate?: string | null;
  isActive?: boolean;
}

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class TriviaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // Câu đố hôm nay (ưu tiên câu có activeDate = hôm nay, fallback câu "always-on")
  async getToday(userId?: string) {
    const today = todayUtcMidnight();

    let q = await this.prisma.triviaQuestion.findFirst({
      where: { isActive: true, activeDate: today },
      orderBy: { createdAt: 'desc' },
    });
    if (!q) {
      q = await this.prisma.triviaQuestion.findFirst({
        where: { isActive: true, activeDate: null },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!q) return null;

    let myAnswer: { choiceIndex: number; isCorrect: boolean } | null = null;
    if (userId) {
      const a = await this.prisma.triviaAnswer.findUnique({
        where: { questionId_userId: { questionId: q.id, userId } },
      });
      if (a) myAnswer = { choiceIndex: a.choiceIndex, isCorrect: a.isCorrect };
    }

    const answered = !!myAnswer;
    return {
      id: q.id,
      question: q.question,
      options: q.options as string[],
      reward: q.reward,
      activeDate: q.activeDate,
      answered,
      // Chỉ tiết lộ đáp án đúng nếu người dùng đã trả lời
      correctIndex: answered ? q.correctIndex : undefined,
      myAnswer,
    };
  }

  async answer(userId: string, questionId: string, choiceIndex: number) {
    const q = await this.prisma.triviaQuestion.findUnique({ where: { id: questionId } });
    if (!q || !q.isActive) throw new NotFoundException('Câu đố không tồn tại');

    const options = q.options as string[];
    if (
      typeof choiceIndex !== 'number' ||
      choiceIndex < 0 ||
      choiceIndex >= options.length
    ) {
      throw new BadRequestException('Lựa chọn không hợp lệ');
    }

    const existing = await this.prisma.triviaAnswer.findUnique({
      where: { questionId_userId: { questionId, userId } },
    });
    if (existing) throw new ConflictException('Bạn đã trả lời câu đố này rồi');

    const isCorrect = choiceIndex === q.correctIndex;
    let rewardGiven = 0;

    if (isCorrect && q.reward > 0) {
      await this.character.adjustCoinByUser(userId, 'trivia', q.reward, 'Đố vui đúng', q.id);
      rewardGiven = q.reward;
    }

    await this.prisma.triviaAnswer.create({
      data: { questionId, userId, choiceIndex, isCorrect, rewardGiven },
    });

    return { correct: isCorrect, correctIndex: q.correctIndex, rewardGiven };
  }

  // ── Admin ──
  list() {
    return this.prisma.triviaQuestion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { answers: true } } },
    });
  }

  private normalize(dto: TriviaDto) {
    const options = (dto.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new BadRequestException('Cần ít nhất 2 lựa chọn');
    if (
      typeof dto.correctIndex !== 'number' ||
      dto.correctIndex < 0 ||
      dto.correctIndex >= options.length
    ) {
      throw new BadRequestException('correctIndex không hợp lệ');
    }
    const activeDate =
      dto.activeDate === undefined || dto.activeDate === null || dto.activeDate === ''
        ? null
        : new Date(dto.activeDate);
    return {
      question: String(dto.question || '').trim(),
      options,
      correctIndex: dto.correctIndex,
      reward: Math.max(0, Math.round(Number(dto.reward) || 0)),
      activeDate,
      isActive: dto.isActive ?? true,
    };
  }

  create(dto: TriviaDto) {
    const data = this.normalize(dto);
    if (!data.question) throw new BadRequestException('Thiếu nội dung câu hỏi');
    return this.prisma.triviaQuestion.create({ data });
  }

  async update(id: string, dto: TriviaDto) {
    const data = this.normalize(dto);
    const exists = await this.prisma.triviaQuestion.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Câu đố không tồn tại');
    return this.prisma.triviaQuestion.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.triviaAnswer.deleteMany({ where: { questionId: id } });
    await this.prisma.triviaQuestion.delete({ where: { id } });
    return { ok: true };
  }
}
