import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Bookmarks — lưu chủ đề để đọc sau
@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(threadId: string, userId: string, note?: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const existing = await this.prisma.bookmark.findUnique({ where: { userId_threadId: { userId, threadId } } });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { userId, threadId, note: note?.slice(0, 255) } });
    return { bookmarked: true };
  }

  async isBookmarked(threadId: string, userId: string) {
    const b = await this.prisma.bookmark.findUnique({ where: { userId_threadId: { userId, threadId } } });
    return { bookmarked: !!b, note: b?.note ?? null };
  }

  listMine(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        thread: {
          select: { id: true, title: true, slug: true, replyCount: true, lastPostAt: true,
            category: { select: { name: true, color: true } } },
        },
      },
    });
  }
}
