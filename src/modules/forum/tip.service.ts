import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';
import { NotificationsService } from '../notifications/notifications.service';

// Tip/Donate bằng gem cho tác giả bài viết
@Injectable()
export class TipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gem: GemService,
    private readonly notifications: NotificationsService,
  ) {}

  async tipPost(postId: string, fromUserId: string, amount: number, message?: string) {
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) throw new BadRequestException('Số gem không hợp lệ');

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, threadId: true, thread: { select: { slug: true, title: true } } },
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (post.authorId === fromUserId) throw new ForbiddenException('Không thể tự donate cho mình');

    // Trừ gem người gửi, cộng gem tác giả
    await this.gem.debit(fromUserId, amt, 'TIP_SENT', postId, 'Donate bài viết');
    await this.gem.credit(post.authorId, amt, 'TIP_RECEIVED', postId, 'Nhận donate');

    const tip = await this.prisma.tip.create({
      data: { fromUserId, toUserId: post.authorId, postId, threadId: post.threadId, amount: amt, message: message?.slice(0, 255) },
    });

    await this.notifications.notify(post.authorId, {
      type: 'GEM_RECEIVED',
      title: `Bạn nhận được ${amt} 💎 donate!`,
      body: message || post.thread.title,
      link: `/forum/${post.thread.slug}#post-${postId}`,
      actorId: fromUserId,
    }).catch(() => {});

    return { ok: true, amount: amt, tipId: tip.id };
  }

  // Tổng gem + số lượt donate theo từng post (để hiển thị)
  async totalsForPosts(postIds: string[]): Promise<Record<string, { total: number; count: number }>> {
    if (!postIds.length) return {};
    const rows = await this.prisma.tip.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const out: Record<string, { total: number; count: number }> = {};
    for (const r of rows) if (r.postId) out[r.postId] = { total: r._sum.amount ?? 0, count: r._count._all };
    return out;
  }

  // Lịch sử donate đã nhận của user
  listReceived(userId: string) {
    return this.prisma.tip.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { fromUser: { select: { username: true, displayName: true, avatar: true } } },
    });
  }
}
