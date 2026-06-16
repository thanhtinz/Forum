import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert reading progress — mark a specific post as the last-read position */
  async markRead(userId: string, threadId: string, postId: string) {
    await this.prisma.threadView.upsert({
      where: { userId_threadId: { userId, threadId } },
      update: { lastReadPostId: postId, lastReadAt: new Date(), viewedAt: new Date() },
      create: { userId, threadId, lastReadPostId: postId },
    });
    return { success: true };
  }

  /** Get reading progress for a single thread */
  async getProgress(userId: string, threadId: string) {
    const view = await this.prisma.threadView.findUnique({
      where: { userId_threadId: { userId, threadId } },
      select: { lastReadPostId: true, lastReadAt: true },
    });
    return {
      lastReadPostId: view?.lastReadPostId ?? null,
      lastReadAt: view?.lastReadAt ?? null,
    };
  }

  /** Get reading progress for multiple threads (bulk — for thread list) */
  async getBulkProgress(userId: string, threadIds: string[]) {
    if (!threadIds.length) return {};
    const views = await this.prisma.threadView.findMany({
      where: { userId, threadId: { in: threadIds } },
      select: { threadId: true, lastReadPostId: true },
    });
    const map: Record<string, string | null> = {};
    for (const v of views) {
      map[v.threadId] = v.lastReadPostId;
    }
    return map;
  }

  /** Count unread posts after the last-read post in a thread */
  async getUnreadCount(userId: string, threadId: string) {
    const view = await this.prisma.threadView.findUnique({
      where: { userId_threadId: { userId, threadId } },
      select: { lastReadPostId: true },
    });

    if (!view?.lastReadPostId) {
      // Never read — all posts are "unread"
      const total = await this.prisma.post.count({
        where: { threadId, isDeleted: false, isApproved: true },
      });
      return { unreadCount: total };
    }

    // Find the createdAt of the last-read post
    const lastReadPost = await this.prisma.post.findUnique({
      where: { id: view.lastReadPostId },
      select: { createdAt: true },
    });
    if (!lastReadPost) return { unreadCount: 0 };

    const unreadCount = await this.prisma.post.count({
      where: {
        threadId,
        isDeleted: false,
        isApproved: true,
        createdAt: { gt: lastReadPost.createdAt },
      },
    });
    return { unreadCount };
  }

  /** Bulk unread counts for thread list badges */
  async getBulkUnreadCounts(userId: string, threadIds: string[]) {
    if (!threadIds.length) return {};

    const views = await this.prisma.threadView.findMany({
      where: { userId, threadId: { in: threadIds }, lastReadPostId: { not: null } },
      select: { threadId: true, lastReadPostId: true },
    });

    // For threads with no view record, all posts are unread
    const viewMap = new Map(views.map((v) => [v.threadId, v.lastReadPostId!]));

    // Get createdAt for all last-read posts
    const postIds = views.map((v) => v.lastReadPostId!).filter(Boolean);
    const posts = postIds.length
      ? await this.prisma.post.findMany({
          where: { id: { in: postIds } },
          select: { id: true, createdAt: true },
        })
      : [];
    const postDateMap = new Map(posts.map((p) => [p.id, p.createdAt]));

    const result: Record<string, number> = {};

    for (const threadId of threadIds) {
      const lastReadPostId = viewMap.get(threadId);
      if (!lastReadPostId) {
        // Never viewed — count all posts
        result[threadId] = -1; // signal "never read"
        continue;
      }
      const lastReadDate = postDateMap.get(lastReadPostId);
      if (!lastReadDate) {
        result[threadId] = 0;
        continue;
      }
      const count = await this.prisma.post.count({
        where: {
          threadId,
          isDeleted: false,
          isApproved: true,
          createdAt: { gt: lastReadDate },
        },
      });
      result[threadId] = count;
    }

    return result;
  }
}
