import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreatePollDto {
  question: string;
  options: string[];
  multiple?: boolean;
  maxOptions?: number;
  closesAt?: string;
}

// FoF Polls — bình chọn gắn vào thread
@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  async createForThread(threadId: string, authorId: string, dto: CreatePollDto) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { authorId: true, poll: { select: { id: true } } } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.authorId !== authorId) throw new ForbiddenException('Chỉ tác giả mới tạo bình chọn');
    if (thread.poll) throw new BadRequestException('Thread đã có bình chọn');
    const opts = (dto.options || []).map((t) => t.trim()).filter(Boolean);
    if (opts.length < 2) throw new BadRequestException('Cần ít nhất 2 lựa chọn');
    if (opts.length > 20) throw new BadRequestException('Tối đa 20 lựa chọn');

    return this.prisma.poll.create({
      data: {
        threadId,
        question: dto.question.trim().slice(0, 255),
        multiple: dto.multiple ?? false,
        maxOptions: dto.multiple ? Math.max(1, Math.min(dto.maxOptions ?? opts.length, opts.length)) : 1,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        options: { create: opts.map((text, i) => ({ text: text.slice(0, 200), sortOrder: i })) },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // Trả về poll kèm trạng thái vote của user
  async getForThread(threadId: string, userId?: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { threadId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!poll) return null;

    let myVotes: string[] = [];
    if (userId) {
      const votes = await this.prisma.pollVote.findMany({ where: { pollId: poll.id, userId }, select: { optionId: true } });
      myVotes = votes.map((v) => v.optionId);
    }
    const isClosed = !!poll.closesAt && poll.closesAt.getTime() < Date.now();
    return {
      ...poll,
      isClosed,
      hasVoted: myVotes.length > 0,
      myVotes,
      options: poll.options.map((o) => ({
        ...o,
        percent: poll.totalVotes > 0 ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0,
      })),
    };
  }

  async vote(pollId: string, userId: string, optionIds: string[]) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId }, include: { options: { select: { id: true } } } });
    if (!poll) throw new NotFoundException('Bình chọn không tồn tại');
    if (poll.closesAt && poll.closesAt.getTime() < Date.now()) throw new ForbiddenException('Bình chọn đã đóng');

    const validIds = new Set(poll.options.map((o) => o.id));
    const chosen = [...new Set(optionIds)].filter((id) => validIds.has(id));
    if (chosen.length === 0) throw new BadRequestException('Lựa chọn không hợp lệ');
    if (!poll.multiple && chosen.length > 1) throw new BadRequestException('Chỉ được chọn 1 đáp án');
    if (poll.multiple && chosen.length > poll.maxOptions) throw new BadRequestException(`Chọn tối đa ${poll.maxOptions} đáp án`);

    await this.prisma.$transaction(async (tx) => {
      // Xoá vote cũ (cho phép đổi lựa chọn)
      const old = await tx.pollVote.findMany({ where: { pollId, userId }, select: { optionId: true } });
      if (old.length) {
        await tx.pollVote.deleteMany({ where: { pollId, userId } });
        for (const o of old) {
          await tx.pollOption.update({ where: { id: o.optionId }, data: { voteCount: { decrement: 1 } } });
        }
        await tx.poll.update({ where: { id: pollId }, data: { totalVotes: { decrement: old.length } } });
      }
      // Thêm vote mới
      for (const optionId of chosen) {
        await tx.pollVote.create({ data: { pollId, optionId, userId } });
        await tx.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
      }
      await tx.poll.update({ where: { id: pollId }, data: { totalVotes: { increment: chosen.length } } });
    });

    return this.getForThread((await this.prisma.poll.findUnique({ where: { id: pollId }, select: { threadId: true } }))!.threadId, userId);
  }
}
