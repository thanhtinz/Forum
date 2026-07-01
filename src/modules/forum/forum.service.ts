import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiddenContentService } from '../hidden-content/hidden-content.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ThreadType, ThreadStatus, UserRole } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { marked } from 'marked';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';
import { CharacterService } from '../game/character/character.service';
import { TrophyService } from '../reputation/trophy.service';
import { PrisonService } from '../moderation/prison.service';
import { ForumTextService } from './forum-text.service';
import { SubscriptionService } from './subscription.service';
import { TipService } from './tip.service';
import { BlockService } from '../profile-extra/block.service';
import { UserRole as Role } from '@prisma/client';

export interface CreateThreadDto {
  categoryId: string;
  title: string;
  content: string; // raw BBCode/MD
  threadType?: ThreadType; // kiểu chủ đề (DISCUSSION | QUESTION | POLL | ARTICLE | SUGGESTION)
  prefixId?: string; // tiền tố do admin tạo theo danh mục
  tagIds?: string[];
}

export interface CreatePostDto {
  threadId: string;
  content: string;
  parentId?: string; // quote reply
}

export interface CategoryDto {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  sortOrder?: number;
  moduleType?: string; // NONE | JOB
  parentId?: string | null; // danh mục cha (null = cấp gốc)
  staffOnlyPost?: boolean;  // chỉ Ban quản trị được đăng
  isPrivate?: boolean;
  requirePrefix?: boolean;  // bắt buộc chọn tiền tố khi đăng bài
  minTags?: number;         // số thẻ tối thiểu khi đăng bài
  defaultSortOrder?: string; // thứ tự mặc định bài viết
  countMessages?: boolean;  // tính số bài của user trong diễn đàn này
  findNew?: boolean;        // hiển thị trong trang "Bài viết mới"
}

export interface ThreadListQuery {
  categoryId?: string;
  threadType?: string;  // lọc theo kiểu chủ đề (DISCUSSION | QUESTION | POLL | ARTICLE | SUGGESTION)
  prefixId?: string;
  tagId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes' | 'replies';
  unanswered?: boolean;
  q?: string;
  authorId?: string;
}

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hiddenContent: HiddenContentService,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
    private readonly character: CharacterService,
    private readonly trophy: TrophyService,
    private readonly prison: PrisonService,
    private readonly text: ForumTextService,
    private readonly subs: SubscriptionService,
    private readonly tips: TipService,
    private readonly block: BlockService,
  ) {}

  // ──────────────────────────────────────────────
  // THREADS
  // ──────────────────────────────────────────────

  async listCategories() {
    const cats = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, slug: true, icon: true, iconUrl: true, color: true,
        threadCount: true, postCount: true, description: true, moduleType: true, parentId: true, minRolePost: true,
        threads: {
          where: { isApproved: true, isHidden: false },
          orderBy: { lastPostAt: 'desc' },
          take: 1,
          select: {
            title: true, slug: true, lastPostAt: true, createdAt: true,
            prefixRef: { select: { label: true, color: true } },
            author: { select: { username: true, displayName: true, avatar: true } },
          },
        },
      },
    });
    return cats.map((c) => {
      const t = c.threads[0];
      const { threads, ...rest } = c;
      return {
        ...rest,
        latest: t ? {
          title: t.title, slug: t.slug, at: t.lastPostAt ?? t.createdAt,
          prefixLabel: t.prefixRef?.label ?? null,
          prefixColor: t.prefixRef?.color ?? null,
          author: t.author?.displayName || t.author?.username || null,
          authorAvatar: t.author?.avatar ?? null,
        } : null,
      };
    });
  }

  // ──────────────────────────────────────────────
  // TIỀN TỐ BÀI VIẾT THEO DANH MỤC (admin tạo, user chọn)
  // ──────────────────────────────────────────────
  listCategoryPrefixes(categoryId: string) {
    return this.prisma.categoryPrefix.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true, color: true, sortOrder: true },
    });
  }

  async createCategoryPrefix(categoryId: string, dto: { label: string; color?: string; sortOrder?: number }) {
    if (!dto.label?.trim()) throw new BadRequestException('Thiếu nhãn tiền tố');
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');
    return this.prisma.categoryPrefix.create({
      data: { categoryId, label: dto.label.trim(), color: dto.color || null, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateCategoryPrefix(id: string, dto: { label?: string; color?: string; sortOrder?: number }) {
    const exist = await this.prisma.categoryPrefix.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Tiền tố không tồn tại');
    return this.prisma.categoryPrefix.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async deleteCategoryPrefix(id: string) {
    await this.prisma.categoryPrefix.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Tiền tố không tồn tại');
    });
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // ADMIN: quản lý danh mục (CRUD) + cờ module
  // ──────────────────────────────────────────────
  async adminListCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { threads: true } } },
    });
  }

  async createCategory(dto: CategoryDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Thiếu tên danh mục');
    const slug = dto.slug?.trim()
      ? slugify(dto.slug, { lower: true, strict: true })
      : await this.generateUniqueCategorySlug(dto.name);
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        iconUrl: dto.iconUrl ?? null,
        color: dto.color ?? null,
        sortOrder: dto.sortOrder ?? 0,
        moduleType: this.normalizeModuleType(dto.moduleType),
        parentId: dto.parentId || null,
        isPrivate: dto.isPrivate ?? false,
        minRolePost: dto.staffOnlyPost ? 'MODERATOR' : 'MEMBER',
        requirePrefix: dto.requirePrefix ?? false,
        minTags: dto.minTags ?? 0,
        defaultSortOrder: dto.defaultSortOrder ?? 'lastPost',
        countMessages: dto.countMessages ?? true,
        findNew: dto.findNew ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: CategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.icon !== undefined) data.icon = dto.icon || null;
    if (dto.iconUrl !== undefined) data.iconUrl = dto.iconUrl || null;
    if (dto.color !== undefined) data.color = dto.color || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.moduleType !== undefined) data.moduleType = this.normalizeModuleType(dto.moduleType);
    if (dto.slug !== undefined && dto.slug.trim()) data.slug = slugify(dto.slug, { lower: true, strict: true });
    if (dto.parentId !== undefined) data.parentId = dto.parentId && dto.parentId !== id ? dto.parentId : null;
    if (dto.isPrivate !== undefined) data.isPrivate = dto.isPrivate;
    if (dto.staffOnlyPost !== undefined) data.minRolePost = dto.staffOnlyPost ? 'MODERATOR' : 'MEMBER';
    if (dto.requirePrefix !== undefined) data.requirePrefix = dto.requirePrefix;
    if (dto.minTags !== undefined) data.minTags = dto.minTags;
    if (dto.defaultSortOrder !== undefined) data.defaultSortOrder = dto.defaultSortOrder;
    if (dto.countMessages !== undefined) data.countMessages = dto.countMessages;
    if (dto.findNew !== undefined) data.findNew = dto.findNew;
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.thread.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('Danh mục còn bài viết, không thể xoá');
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  // Bài viết (post/reply) gần đây của 1 user — cho tab "Hoạt động mới nhất"
  async listUserPosts(authorId: string, limit = 20) {
    return this.prisma.post.findMany({
      where: { authorId, isDeleted: false, isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 20, 1), 50),
      select: {
        id: true, content: true, createdAt: true, isFirstPost: true,
        thread: { select: { title: true, slug: true } },
      },
    });
  }

  private normalizeModuleType(v?: string): string {
    const allowed = ['NONE'];
    const up = (v ?? 'NONE').toUpperCase();
    return allowed.includes(up) ? up : 'NONE';
  }

  private async generateUniqueCategorySlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || createId().slice(0, 8);
    let slug = base;
    let i = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  async getThreadList(query: ThreadListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { isApproved: true, isHidden: false };
    if (query.authorId) where.authorId = query.authorId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.threadType) where.threadType = query.threadType;
    if (query.prefixId) where.prefixId = query.prefixId;
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }
    if (query.q?.trim()) {
      where.title = { contains: query.q.trim(), mode: 'insensitive' };
    }
    if (query.unanswered) {
      where.replyCount = 0;
    }

    const orderBy: any =
      query.sortBy === 'createdAt'
        ? { createdAt: 'desc' }
        : query.sortBy === 'views'
        ? { viewCount: 'desc' }
        : query.sortBy === 'likes'
        ? { likeCount: 'desc' }
        : query.sortBy === 'replies'
        ? { replyCount: 'desc' }
        : { lastPostAt: 'desc' };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, orderBy],
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { id: true, name: true, slug: true, color: true } },
          prefixRef: { select: { id: true, label: true, color: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    return {
      data: threads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Admin: liệt kê TẤT CẢ chủ đề (kể cả ẩn/chờ duyệt/khoá) để quản lý ──
  async getAdminThreadList(query: {
    q?: string;
    categoryId?: string;
    authorId?: string;
    status?: 'all' | 'pending' | 'hidden' | 'locked';
    page?: number;
    limit?: number;
    sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes' | 'replies';
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.authorId) where.authorId = query.authorId;
    if (query.q?.trim()) where.title = { contains: query.q.trim(), mode: 'insensitive' };
    if (query.status === 'pending') where.isApproved = false;
    else if (query.status === 'hidden') where.isHidden = true;
    else if (query.status === 'locked') where.isLocked = true;

    const orderBy: any =
      query.sortBy === 'createdAt'
        ? { createdAt: 'desc' }
        : query.sortBy === 'views'
        ? { viewCount: 'desc' }
        : query.sortBy === 'likes'
        ? { likeCount: 'desc' }
        : query.sortBy === 'replies'
        ? { replyCount: 'desc' }
        : { lastPostAt: 'desc' };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    return {
      data: threads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getThread(slug: string, userId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, reputationScore: true, postCount: true, createdAt: true } },
        category: true,
        prefixRef: { select: { id: true, label: true, color: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!thread) throw new NotFoundException('Không tìm thấy bài viết');
    // Bài chờ duyệt: chỉ tác giả & mod xem được (mod xem qua queue bằng id)
    if (!thread.isApproved && thread.authorId !== userId) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    // Bài đã ẩn: chỉ tác giả xem được (BQT ẩn/hiện qua hành động)
    if (thread.isHidden && thread.authorId !== userId) {
      throw new NotFoundException('Bài viết đã bị ẩn');
    }

    // Tăng view count (non-blocking)
    this.prisma.thread.update({
      where: { id: thread.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    // Ghi threadView cho user
    if (userId) {
      this.prisma.threadView.upsert({
        where: { userId_threadId: { userId, threadId: thread.id } },
        update: { viewedAt: new Date() },
        create: { userId, threadId: thread.id },
      }).catch(() => {});
    }

    return thread;
  }

  async createThread(dto: CreateThreadDto, authorId: string) {
    await this.prison.assertNotJailed(authorId);
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category không tồn tại');

    // Validate tiền tố (nếu có) phải thuộc đúng danh mục
    if (dto.prefixId) {
      const pre = await this.prisma.categoryPrefix.findUnique({ where: { id: dto.prefixId } });
      if (!pre || pre.categoryId !== dto.categoryId) throw new BadRequestException('Tiền tố không hợp lệ');
    }

    const slug = await this.generateUniqueSlug(dto.title);
    const { html: content, mentioned } = await this.buildContent(dto.content, authorId);
    const pending = await this.needsApproval(authorId);

    const thread = await this.prisma.$transaction(async (tx) => {
      const t = await tx.thread.create({
        data: {
          categoryId: dto.categoryId,
          authorId,
          title: dto.title,
          slug,
          threadType: dto.threadType ?? ThreadType.DISCUSSION,
          prefixId: dto.prefixId ?? null,
          isApproved: !pending,
          lastPostAt: new Date(),
          lastPostUserId: authorId,
        },
      });

      // Tạo post đầu tiên (= nội dung thread), position = 0
      await tx.post.create({
        data: {
          threadId: t.id,
          authorId,
          content,
          contentRaw: dto.content,
          isFirstPost: true,
          position: 0,
          isApproved: !pending,
        },
      });

      // Gắn tags
      if (dto.tagIds?.length) {
        await tx.threadTag.createMany({
          data: dto.tagIds.map((tagId) => ({ threadId: t.id, tagId })),
          skipDuplicates: true,
        });
        await tx.tag.updateMany({
          where: { id: { in: dto.tagIds } },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Chỉ cập nhật thống kê khi đã được duyệt
      if (!pending) {
        await tx.category.update({ where: { id: dto.categoryId }, data: { threadCount: { increment: 1 } } });
        await tx.user.update({ where: { id: authorId }, data: { threadCount: { increment: 1 } } });
      }

      return t;
    });

    // Tác giả tự động theo dõi thread của mình
    await this.subs.ensure(thread.id, authorId);

    if (pending) {
      // Chờ duyệt: không phát event/EXP/notify cho tới khi mod duyệt
      return { ...thread, pendingApproval: true };
    }

    this.events.emit('forum.thread.created', { threadId: thread.id, authorId });
    await this.notifyMentions(mentioned, authorId, dto.title, `/forum/${slug}`);
    await this.character.addForumExp(authorId, 10, 'create_thread');
    await this.trophy.checkAndAward(authorId);

    return thread;
  }

  // FoF Approval: user cần duyệt nếu là MEMBER và postCount < ngưỡng cấu hình (0 = tắt)
  private async needsApproval(userId: string): Promise<boolean> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.approvalPostThreshold' } }).catch(() => null);
    const v = cfg?.value;
    const threshold = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    if (!Number.isFinite(threshold) || threshold <= 0) return false;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, postCount: true, threadCount: true } });
    if (!user) return false;
    if (user.role !== Role.MEMBER) return false; // VIP/MOD/ADMIN miễn duyệt
    return (user.postCount + user.threadCount) < threshold;
  }

  async updateThread(threadId: string, userId: string, role: string, dto: { title?: string; prefixId?: string | null; categoryId?: string }) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const isMod = role === 'ADMIN' || role === 'MODERATOR';
    if (thread.authorId !== userId && !isMod) throw new ForbiddenException('Không có quyền');

    const patch: any = {};
    if (dto.title?.trim()) {
      patch.title = dto.title.trim().slice(0, 255);
      patch.slug = await this.generateUniqueSlug(dto.title.trim(), threadId);
    }
    if (dto.prefixId !== undefined) {
      patch.prefixId = dto.prefixId || null;
    }
    if (dto.categoryId && isMod) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException('Category không tồn tại');
      patch.categoryId = dto.categoryId;
    }

    return this.prisma.thread.update({ where: { id: threadId }, data: patch });
  }

  // ──────────────────────────────────────────────
  // POSTS
  // ──────────────────────────────────────────────

  // Bài gốc (isFirstPost) luôn hiện riêng ở đầu trang (không phân trang theo nó);
  // chỉ các bài trả lời (bình luận) mới được phân trang theo `limit`.
  async getPostsForThread(threadId: string, userId: string | null, page = 1, limit = 20, canSeeUnapproved = false) {
    const skip = (page - 1) * limit;

    // Ẩn bài chờ duyệt với người khác (chỉ tác giả & mod thấy)
    const approvalFilter = canSeeUnapproved
      ? {}
      : { OR: [{ isApproved: true }, ...(userId ? [{ authorId: userId }] : [])] };
    const baseWhere: any = { threadId, isDeleted: false, ...approvalFilter };

    // Ẩn bài của người đã bị viewer chặn (trừ bài mở đầu thread)
    if (userId && !canSeeUnapproved) {
      const blockedIds = await this.block.getBlockedIds(userId);
      if (blockedIds.length > 0) {
        baseWhere.NOT = { AND: [{ authorId: { in: blockedIds } }, { isFirstPost: false }] };
      }
    }

    const postInclude = {
      author: {
        select: {
          id: true, username: true, displayName: true,
          avatar: true, role: true, postCount: true, threadCount: true,
          reputationScore: true, createdAt: true,
          verifiedBadge: true, avatarFrameUrl: true, shopBadgeUrl: true, nameEffectCss: true,
          signature: true,
        },
      },
      reactions: { select: { emoji: true, userId: true } },
      attachments: true,
    };

    const [firstPostRaw, replies, totalReplies] = await Promise.all([
      this.prisma.post.findFirst({ where: { ...baseWhere, isFirstPost: true }, include: postInclude }),
      this.prisma.post.findMany({
        where: { ...baseWhere, isFirstPost: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: postInclude,
      }),
      this.prisma.post.count({ where: { ...baseWhere, isFirstPost: false } }),
    ]);

    const enriched = await this.enrichPosts(firstPostRaw ? [firstPostRaw, ...replies] : replies, userId, threadId);
    const firstPost = firstPostRaw ? enriched[0] : null;
    const data = firstPostRaw ? enriched.slice(1) : enriched;

    return {
      firstPost,
      data,
      meta: { total: totalReplies, page, limit, totalPages: Math.ceil(totalReplies / limit) },
    };
  }

  // Gắn level tác giả + hidden sections + tổng donate cho danh sách post
  private async enrichPosts(posts: any[], userId: string | null, threadId: string) {
    if (posts.length === 0) return [];
    const tipTotals = await this.tips.totalsForPosts(posts.map((p) => p.id));

    const levelTiers = await this.prisma.levelTier.findMany({ orderBy: { minScore: 'asc' } });
    const computeAuthorLevel = (a: { postCount: number; threadCount: number; reputationScore: number } | null) => {
      if (!a || !levelTiers.length) return {};
      const score = a.postCount + a.threadCount * 2 + a.reputationScore;
      let current: (typeof levelTiers)[number] | null = null;
      for (const t of levelTiers) { if (t.minScore <= score) current = t; }
      if (!current) return {};
      return { levelNum: current.level, levelName: current.name, levelIcon: current.icon, levelColor: current.color };
    };

    return Promise.all(
      posts.map(async (post) => {
        const hiddenSections = await this.hiddenContent.getSectionsForPost(post.id, userId, threadId);
        const tip = tipTotals[post.id] || { total: 0, count: 0 };
        const authorWithLevel = post.author ? { ...post.author, ...computeAuthorLevel(post.author) } : null;
        return { ...post, author: authorWithLevel, hiddenSections, tipTotal: tip.total, tipCount: tip.count };
      }),
    );
  }

  async createPost(dto: CreatePostDto, authorId: string) {
    await this.prison.assertNotJailed(authorId);
    const thread = await this.prisma.thread.findUnique({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.isLocked) throw new ForbiddenException('Thread đã bị khoá');
    if (await this.isReplyBanned(dto.threadId, authorId)) throw new ForbiddenException('Bạn bị cấm trả lời trong chủ đề này');

    const { html: content, mentioned } = await this.buildContent(dto.content, authorId);
    const pending = await this.needsApproval(authorId);

    const post = await this.prisma.$transaction(async (tx) => {
      // position = số bài visible trong thread này (0-indexed: bài mới có position = hiện tại count)
      const existingCount = await tx.post.count({
        where: { threadId: dto.threadId, isApproved: true, isDeleted: false },
      });

      const p = await tx.post.create({
        data: {
          threadId: dto.threadId,
          authorId,
          content,
          contentRaw: dto.content,
          parentId: dto.parentId ?? null,
          position: existingCount,
          isApproved: !pending,
        },
      });

      if (!pending) {
        await tx.thread.update({
          where: { id: dto.threadId },
          data: { replyCount: { increment: 1 }, lastPostAt: new Date(), lastPostUserId: authorId },
        });
        // Lấy cấu hình countMessages của danh mục
        const cat = await tx.category.findUnique({ where: { id: thread.categoryId }, select: { id: true, countMessages: true } });
        await tx.category.update({ where: { id: thread.categoryId }, data: { postCount: { increment: 1 } } });
        if (cat?.countMessages !== false) {
          await tx.user.update({ where: { id: authorId }, data: { postCount: { increment: 1 } } });
        }
      }

      return p;
    });

    // Người trả lời tự động theo dõi thread (kể cả khi chờ duyệt)
    await this.subs.ensure(dto.threadId, authorId);

    if (pending) {
      // Chờ duyệt: không cộng điểm/không thông báo cho tới khi mod duyệt
      return { ...post, pendingApproval: true };
    }

    // Auto-unlock hidden content dựa trên số comment mới
    const newCommentCount = thread.replyCount + 1;
    const firstPost = await this.prisma.post.findFirst({
      where: { threadId: dto.threadId, isFirstPost: true },
      select: { id: true, likeCount: true },
    });
    let unlockedSectionIds: string[] = [];
    if (firstPost) {
      unlockedSectionIds = await this.hiddenContent.checkAndAutoUnlock(
        firstPost.id,
        authorId,
        firstPost.likeCount,
        newCommentCount,
      );
    }

    // Emit events
    this.events.emit('forum.post.created', {
      postId: post.id,
      threadId: dto.threadId,
      authorId,
      threadAuthorId: thread.authorId,
      unlockedSectionIds,
    });

    // Forum EXP cho người trả lời
    await this.character.addForumExp(authorId, 5, 'create_post');
    await this.trophy.checkAndAward(authorId);

    // Notify thread author
    if (thread.authorId !== authorId) {
      await this.notifications.notify(thread.authorId, {
        type: 'THREAD_REPLY',
        title: 'Có người trả lời bài viết của bạn',
        body: thread.title,
        link: `/forum/${thread.slug}#post-${post.id}`,
        actorId: authorId,
      });
    }

    // Thông báo cho người được @mention (trừ những người đã được notify dưới đây)
    const mentionedIds = mentioned.map((m) => m.id);
    await this.notifyMentions(mentioned.filter((m) => m.id !== thread.authorId), authorId, thread.title, `/forum/${thread.slug}#post-${post.id}`);
    // Thông báo cho người theo dõi thread (trừ tác giả & người được mention đã nhận)
    await this.subs.notifyNewReply(dto.threadId, thread.title, thread.slug, post.id, authorId, [thread.authorId, ...mentionedIds]);

    return post;
  }

  // ──────────────────────────────────────────────
  // REACTIONS (like/emoji)
  // ──────────────────────────────────────────────

  async reactToPost(postId: string, userId: string, emoji = 'like') {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true, likeCount: true, thread: { select: { replyCount: true } } },
    });
    if (!post) throw new NotFoundException('Post không tồn tại');

    // Toggle reaction
    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });

    let newLikeCount: number;

    if (existing) {
      // Bỏ reaction
      await this.prisma.$transaction([
        this.prisma.postReaction.delete({ where: { id: existing.id } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      newLikeCount = post.likeCount - 1;
    } else {
      // Thêm reaction
      await this.prisma.$transaction([
        this.prisma.postReaction.create({ data: { postId, userId, emoji } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      newLikeCount = post.likeCount + 1;

      // Check hidden content auto-unlock cho user này
      // (chỉ check section của post này khi có like mới)
      const unlockedIds = await this.hiddenContent.checkAndAutoUnlock(
        postId,
        userId,
        newLikeCount,
        post.thread.replyCount,
      );

      if (unlockedIds.length > 0) {
        this.events.emit('hidden.auto_unlocked', { userId, sectionIds: unlockedIds });
      }

      // Notify tác giả (không self-notify)
      if (post.authorId !== userId) {
        // Tác giả nhận EXP khi được like
        await this.character.addForumExp(post.authorId, 2, 'post_liked');
        await this.notifications.notify(post.authorId, {
          type: 'POST_LIKE',
          title: 'Bài viết của bạn được thích',
          link: `/forum/post/${postId}`,
          actorId: userId,
        });
      }

      // Tự động chọn câu trả lời hay nhất khi đủ lượt reaction (FoF Best Answer auto)
      await this.maybeAutoBestAnswer(post.threadId, userId).catch(() => {});
    }

    return { liked: !existing, likeCount: newLikeCount };
  }

  // Admin: đọc / ghi ngưỡng tự chọn best answer
  async getAutoBestConfig() {
    return { threshold: await this.getAutoBestThreshold() };
  }
  async setAutoBestConfig(threshold: number) {
    const n = Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 10;
    await this.prisma.siteConfig.upsert({
      where: { key: 'forum.autoBestAnswerLikes' },
      update: { value: n },
      create: { key: 'forum.autoBestAnswerLikes', value: n },
    });
    return { threshold: n };
  }

  // Lấy ngưỡng like tự chọn best answer (0 = tắt)
  private async getAutoBestThreshold(): Promise<number> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.autoBestAnswerLikes' } }).catch(() => null);
    const v = cfg?.value;
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 10;
    return Number.isFinite(n) && n >= 0 ? n : 10;
  }

  // Nếu chưa có ai chọn thủ công, tự chọn (hoặc cập nhật) reply được like nhiều nhất làm best answer
  private async maybeAutoBestAnswer(threadId: string, actorId: string) {
    const threshold = await this.getAutoBestThreshold();
    if (threshold <= 0) return;

    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, slug: true, title: true, bestAnswerId: true, bestAnswerAuto: true },
    });
    if (!thread) return;
    // Tôn trọng lựa chọn thủ công — không ghi đè
    if (thread.bestAnswerId && !thread.bestAnswerAuto) return;

    // Reply được like nhiều nhất (không tính bài gốc)
    const top = await this.prisma.post.findFirst({
      where: { threadId, isFirstPost: false, isDeleted: false },
      orderBy: { likeCount: 'desc' },
      select: { id: true, authorId: true, likeCount: true },
    });
    if (!top || top.likeCount < threshold) return;
    if (top.id === thread.bestAnswerId) return; // đã là best answer rồi

    // Bỏ cờ bài auto cũ (nếu có)
    if (thread.bestAnswerId && thread.bestAnswerAuto) {
      await this.prisma.post.update({ where: { id: thread.bestAnswerId }, data: { isHelpful: false } }).catch(() => {});
    }

    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: top.id, bestAnswerAuto: true } }),
      this.prisma.post.update({ where: { id: top.id }, data: { isHelpful: true } }),
    ]);

    // Thưởng + thông báo cho người trả lời (không tự thưởng cho actor đang like)
    if (top.authorId !== actorId) {
      await this.character.addForumExp(top.authorId, 15, 'best_answer_auto').catch(() => {});
    }
    await this.notifications.notify(top.authorId, {
      type: 'BEST_ANSWER',
      title: 'Câu trả lời của bạn được cộng đồng bình chọn là hay nhất! 🏆',
      body: thread.title,
      link: `/forum/${thread.slug}#post-${top.id}`,
      actorId,
    }).catch(() => {});
    await this.trophy.checkAndAward(top.authorId).catch(() => {});
  }

  // ──────────────────────────────────────────────
  // ADMIN / MOD ACTIONS
  // ──────────────────────────────────────────────

  async pinThread(threadId: string, pin: boolean) {
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { isPinned: pin },
    });
  }

  async lockThread(threadId: string, lock: boolean, userId?: string, role?: string) {
    await this.assertThreadOwnerOrStaff(threadId, userId, role);
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { isLocked: lock },
    });
  }

  // Ẩn/hiện bài (không xoá) — tác giả hoặc BQT
  async hideThread(threadId: string, hide: boolean, userId?: string, role?: string) {
    await this.assertThreadOwnerOrStaff(threadId, userId, role);
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { isHidden: hide },
    });
  }

  private async assertThreadOwnerOrStaff(threadId: string, userId?: string, role?: string) {
    const t = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { authorId: true } });
    if (!t) throw new NotFoundException('Không tìm thấy chủ đề');
    const isStaff = role === 'ADMIN' || role === 'MODERATOR';
    if (!isStaff && t.authorId !== userId) throw new BadRequestException('Bạn không có quyền với chủ đề này');
  }

  // ── Move (chuyển chuyên mục) ──
  async moveThread(threadId: string, categoryId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, categoryId: true, replyCount: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const target = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!target) throw new NotFoundException('Chuyên mục không tồn tại');
    if (thread.categoryId === categoryId) return thread;

    const postCount = await this.prisma.post.count({ where: { threadId, isDeleted: false } });
    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { categoryId } }),
      this.prisma.category.update({ where: { id: thread.categoryId }, data: { threadCount: { decrement: 1 }, postCount: { decrement: postCount } } }),
      this.prisma.category.update({ where: { id: categoryId }, data: { threadCount: { increment: 1 }, postCount: { increment: postCount } } }),
    ]);
    return this.prisma.thread.findUnique({ where: { id: threadId } });
  }

  // ── Merge (gộp source vào target) ──
  async mergeThreads(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new BadRequestException('Không thể gộp chính nó');
    const [source, target] = await Promise.all([
      this.prisma.thread.findUnique({ where: { id: sourceId }, select: { id: true, categoryId: true, slug: true } }),
      this.prisma.thread.findUnique({ where: { id: targetId }, select: { id: true, categoryId: true } }),
    ]);
    if (!source || !target) throw new NotFoundException('Thread không tồn tại');

    // Bài gốc của source trở thành trả lời thường trong target
    const movedPosts = await this.prisma.post.count({ where: { threadId: sourceId, isDeleted: false } });

    await this.prisma.$transaction(async (tx) => {
      await tx.post.updateMany({ where: { threadId: sourceId }, data: { threadId: targetId, isFirstPost: false } });
      // Gộp subscriptions/bookmarks (bỏ trùng)
      const subs = await tx.threadSubscription.findMany({ where: { threadId: sourceId }, select: { userId: true } });
      for (const s of subs) await tx.threadSubscription.upsert({ where: { threadId_userId: { threadId: targetId, userId: s.userId } }, update: {}, create: { threadId: targetId, userId: s.userId } });
      await tx.threadSubscription.deleteMany({ where: { threadId: sourceId } });

      // Cập nhật số liệu target
      const total = await tx.post.count({ where: { threadId: targetId, isDeleted: false } });
      await tx.thread.update({ where: { id: targetId }, data: { replyCount: Math.max(0, total - 1), lastPostAt: new Date() } });
      // Giảm thống kê chuyên mục của source và xoá source
      await tx.category.update({ where: { id: source.categoryId }, data: { threadCount: { decrement: 1 } } });
      await tx.thread.delete({ where: { id: sourceId } });
    });

    return { mergedInto: targetId, movedPosts };
  }

  // ──────────────────────────────────────────────
  // APPROVAL QUEUE (FoF Approval)
  // ──────────────────────────────────────────────
  async listPendingApproval() {
    const [threads, posts] = await Promise.all([
      this.prisma.thread.findMany({
        where: { isApproved: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { name: true } },
          posts: { where: { isFirstPost: true }, select: { content: true }, take: 1 },
        },
      }),
      this.prisma.post.findMany({
        where: { isApproved: false, isFirstPost: false, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          thread: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);
    return { threads, posts };
  }

  async approveThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.isApproved) return thread;

    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { isApproved: true } }),
      this.prisma.post.updateMany({ where: { threadId, isFirstPost: true }, data: { isApproved: true } }),
      this.prisma.category.update({ where: { id: thread.categoryId }, data: { threadCount: { increment: 1 } } }),
      this.prisma.user.update({ where: { id: thread.authorId }, data: { threadCount: { increment: 1 } } }),
    ]);

    this.events.emit('forum.thread.created', { threadId, authorId: thread.authorId });
    await this.character.addForumExp(thread.authorId, 10, 'create_thread').catch(() => {});
    await this.trophy.checkAndAward(thread.authorId).catch(() => {});
    await this.notifications.notify(thread.authorId, {
      type: 'SYSTEM', title: 'Bài viết của bạn đã được duyệt ✓', body: thread.title,
      link: `/forum/${thread.slug}`,
    }).catch(() => {});
    return { ...thread, isApproved: true };
  }

  async approvePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { thread: { select: { id: true, categoryId: true, slug: true, title: true, authorId: true } } },
    });
    if (!post) throw new NotFoundException('Post không tồn tại');
    if (post.isApproved) return post;

    const approveCat = await this.prisma.category.findUnique({ where: { id: post.thread.categoryId }, select: { countMessages: true } });
    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { isApproved: true } }),
      this.prisma.thread.update({ where: { id: post.threadId }, data: { replyCount: { increment: 1 }, lastPostAt: new Date(), lastPostUserId: post.authorId } }),
      this.prisma.category.update({ where: { id: post.thread.categoryId }, data: { postCount: { increment: 1 } } }),
      ...(approveCat?.countMessages !== false ? [this.prisma.user.update({ where: { id: post.authorId }, data: { postCount: { increment: 1 } } })] : []),
    ]);

    await this.character.addForumExp(post.authorId, 5, 'create_post').catch(() => {});
    await this.trophy.checkAndAward(post.authorId).catch(() => {});

    // Thông báo trả lời mới + mention + subscribers (giờ mới phát vì đã duyệt)
    const mentioned = await this.text.resolveMentionedUsers(this.text.extractMentions(post.contentRaw), post.authorId);
    const mentionedIds = mentioned.map((m) => m.id);
    if (post.thread.authorId !== post.authorId) {
      await this.notifications.notify(post.thread.authorId, {
        type: 'THREAD_REPLY', title: 'Có người trả lời bài viết của bạn', body: post.thread.title,
        link: `/forum/${post.thread.slug}#post-${post.id}`, actorId: post.authorId,
      }).catch(() => {});
    }
    await this.notifyMentions(mentioned.filter((m) => m.id !== post.thread.authorId), post.authorId, post.thread.title, `/forum/${post.thread.slug}#post-${post.id}`);
    await this.subs.notifyNewReply(post.threadId, post.thread.title, post.thread.slug, post.id, post.authorId, [post.thread.authorId, ...mentionedIds]);
    await this.notifications.notify(post.authorId, {
      type: 'SYSTEM', title: 'Trả lời của bạn đã được duyệt ✓', body: post.thread.title,
      link: `/forum/${post.thread.slug}#post-${post.id}`,
    }).catch(() => {});
    return { ...post, isApproved: true };
  }

  async rejectContent(kind: 'thread' | 'post', id: string) {
    if (kind === 'thread') {
      const thread = await this.prisma.thread.findUnique({ where: { id }, select: { id: true, authorId: true, title: true, isApproved: true } });
      if (!thread) throw new NotFoundException('Thread không tồn tại');
      await this.prisma.thread.delete({ where: { id } });
      await this.notifications.notify(thread.authorId, { type: 'SYSTEM', title: 'Bài viết của bạn không được duyệt', body: thread.title }).catch(() => {});
    } else {
      const post = await this.prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
      if (!post) throw new NotFoundException('Post không tồn tại');
      await this.prisma.post.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      await this.notifications.notify(post.authorId, { type: 'SYSTEM', title: 'Trả lời của bạn không được duyệt' }).catch(() => {});
    }
    return { rejected: true };
  }

  // Admin: xoá vĩnh viễn 1 chủ đề (kể cả đã duyệt) — dùng ở trang Quản lý bài viết.
  // Cascade xoá theo posts/tags/poll/subscriptions/bookmarks/reply-bans (đã khai báo onDelete: Cascade).
  async deleteThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true, title: true, categoryId: true, isApproved: true },
    });
    if (!thread) throw new NotFoundException('Thread không tồn tại');

    await this.prisma.$transaction(async (tx) => {
      if (thread.isApproved) {
        await tx.category.update({ where: { id: thread.categoryId }, data: { threadCount: { decrement: 1 } } });
      }
      await tx.thread.delete({ where: { id: threadId } });
    });

    await this.notifications.notify(thread.authorId, {
      type: 'SYSTEM',
      title: 'Chủ đề của bạn đã bị xoá bởi quản trị viên',
      body: thread.title,
    }).catch(() => {});

    return { deleted: true };
  }

  // Admin: đọc/ghi ngưỡng duyệt bài (số bài tối thiểu để miễn duyệt; 0 = tắt)
  async getApprovalConfig() {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.approvalPostThreshold' } }).catch(() => null);
    const v = cfg?.value;
    const threshold = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    return { threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 0 };
  }
  async setApprovalConfig(threshold: number) {
    const n = Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 0;
    await this.prisma.siteConfig.upsert({
      where: { key: 'forum.approvalPostThreshold' },
      update: { value: n }, create: { key: 'forum.approvalPostThreshold', value: n },
    });
    return { threshold: n };
  }

  // ── Split (tách bài viết sang chủ đề mới) ──
  async splitThread(
    threadId: string,
    postIds: string[],
    newTitle: string,
    userId: string,
    newCategoryId?: string,
  ) {
    if (!postIds.length) throw new BadRequestException('Chưa chọn bài viết nào để tách');
    if (!newTitle.trim()) throw new BadRequestException('Tiêu đề chủ đề mới không được trống');

    // Kiểm tra quyền mod
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!actor || (actor.role !== Role.ADMIN && actor.role !== Role.MODERATOR)) {
      throw new ForbiddenException('Chỉ moderator mới có thể tách bài');
    }

    const source = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, categoryId: true, slug: true, title: true } });
    if (!source) throw new NotFoundException('Thread không tồn tại');

    // Kiểm tra tất cả post thuộc thread nguồn và không phải bài gốc
    const postsToMove = await this.prisma.post.findMany({
      where: { id: { in: postIds }, threadId },
      select: { id: true, isFirstPost: true, authorId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (postsToMove.length !== postIds.length) {
      throw new BadRequestException('Một số bài viết không thuộc chủ đề này');
    }
    if (postsToMove.some((p) => p.isFirstPost)) {
      throw new BadRequestException('Không thể tách bài viết gốc');
    }

    const categoryId = newCategoryId || source.categoryId;
    const targetCategory = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!targetCategory) throw new NotFoundException('Chuyên mục không tồn tại');

    const slug = await this.generateUniqueSlug(newTitle);
    const firstSplitPost = postsToMove[0];

    const newThread = await this.prisma.$transaction(async (tx) => {
      // Tạo thread mới
      const t = await tx.thread.create({
        data: {
          categoryId,
          authorId: firstSplitPost.authorId,
          title: newTitle,
          slug,
          threadType: ThreadType.DISCUSSION,
          isApproved: true,
          lastPostAt: new Date(),
          lastPostUserId: postsToMove[postsToMove.length - 1].authorId,
          replyCount: Math.max(0, postsToMove.length - 1),
        },
      });

      // Bài đầu tiên của nhóm tách trở thành firstPost của thread mới
      await tx.post.update({
        where: { id: firstSplitPost.id },
        data: { threadId: t.id, isFirstPost: true },
      });

      // Chuyển các bài còn lại
      if (postsToMove.length > 1) {
        const restIds = postsToMove.slice(1).map((p) => p.id);
        await tx.post.updateMany({
          where: { id: { in: restIds } },
          data: { threadId: t.id },
        });
      }

      // Cập nhật replyCount của thread nguồn
      const sourceTotal = await tx.post.count({ where: { threadId, isDeleted: false } });
      await tx.thread.update({
        where: { id: threadId },
        data: { replyCount: Math.max(0, sourceTotal - 1) },
      });

      // Cập nhật thống kê chuyên mục nếu khác category
      if (categoryId !== source.categoryId) {
        await tx.category.update({ where: { id: categoryId }, data: { threadCount: { increment: 1 }, postCount: { increment: postsToMove.length } } });
        await tx.category.update({ where: { id: source.categoryId }, data: { postCount: { decrement: postsToMove.length } } });
      } else {
        await tx.category.update({ where: { id: categoryId }, data: { threadCount: { increment: 1 } } });
      }

      return t;
    });

    return newThread;
  }

  async deletePost(postId: string, deletedById: string, reason?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, isFirstPost: true, thread: { select: { categoryId: true, replyCount: true } } },
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });
    if (!post.isFirstPost && post.thread) {
      await this.prisma.thread.update({
        where: { id: post.threadId },
        data: { replyCount: { decrement: 1 } },
      }).catch(() => {});
    }
    return updated;
  }

  // ──────────────────────────────────────────────
  // EDIT POST (+ lịch sử chỉnh sửa)
  // ──────────────────────────────────────────────

  async editPost(postId: string, editorId: string, newRaw: string, reason?: string, editorRole?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true, contentRaw: true, isDeleted: true, thread: { select: { isLocked: true, slug: true } } },
    });
    if (!post || post.isDeleted) throw new NotFoundException('Bài viết không tồn tại');
    const isMod = editorRole === 'ADMIN' || editorRole === 'MODERATOR';
    if (post.authorId !== editorId && !isMod) throw new ForbiddenException('Không có quyền sửa bài này');
    if (post.thread?.isLocked && !isMod) throw new ForbiddenException('Thread đã bị khoá');

    const { html: newContent } = await this.buildContent(newRaw, editorId);

    await this.prisma.$transaction([
      // Lưu lịch sử cũ
      this.prisma.postEditHistory.create({
        data: { postId, editorId, oldContent: post.content, oldContentRaw: post.contentRaw, editReason: reason ?? null },
      }),
      // Cập nhật nội dung
      this.prisma.post.update({
        where: { id: postId },
        data: { content: newContent, contentRaw: newRaw, editCount: { increment: 1 }, lastEditAt: new Date() },
      }),
    ]);
    return { id: postId, content: newContent, contentRaw: newRaw };
  }

  async getPostEditHistory(postId: string) {
    return this.prisma.postEditHistory.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, editReason: true, createdAt: true,
        oldContentRaw: true,
        editor: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // THREAD REPLY BAN
  // ──────────────────────────────────────────────

  async banReply(threadId: string, userId: string, bannedById: string, reason?: string, expiresAt?: Date) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    return this.prisma.threadReplyBan.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId, bannedById, reason: reason ?? null, expiresAt: expiresAt ?? null },
      update: { bannedById, reason: reason ?? null, expiresAt: expiresAt ?? null, createdAt: new Date() },
    });
  }

  async unbanReply(threadId: string, userId: string) {
    await this.prisma.threadReplyBan.deleteMany({ where: { threadId, userId } });
    return { ok: true };
  }

  async getThreadReplyBans(threadId: string) {
    return this.prisma.threadReplyBan.findMany({
      where: { threadId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        bannedBy: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  private async isReplyBanned(threadId: string, userId: string): Promise<boolean> {
    const ban = await this.prisma.threadReplyBan.findUnique({
      where: { threadId_userId: { threadId, userId } },
      select: { expiresAt: true },
    });
    if (!ban) return false;
    if (ban.expiresAt && ban.expiresAt < new Date()) {
      // Hết hạn — tự xoá
      await this.prisma.threadReplyBan.deleteMany({ where: { threadId, userId } }).catch(() => {});
      return false;
    }
    return true;
  }

  // ──────────────────────────────────────────────
  // BATCH MODERATION (bulk actions on posts)
  // ──────────────────────────────────────────────

  async batchDeletePosts(postIds: string[], deletedById: string) {
    await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });
    return { deleted: postIds.length };
  }

  async batchApprovePosts(postIds: string[]) {
    await this.prisma.post.updateMany({
      where: { id: { in: postIds }, isApproved: false },
      data: { isApproved: true },
    });
    return { approved: postIds.length };
  }

  async batchMoveThreads(threadIds: string[], categoryId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');
    await this.prisma.thread.updateMany({
      where: { id: { in: threadIds } },
      data: { categoryId },
    });
    return { moved: threadIds.length };
  }

  async batchDeleteThreads(threadIds: string[], deletedById: string) {
    await this.prisma.thread.updateMany({
      where: { id: { in: threadIds } },
      data: { isHidden: true },
    });
    return { deleted: threadIds.length };
  }

  // ──────────────────────────────────────────────
  // MOVE POST to another thread
  // ──────────────────────────────────────────────

  async movePost(postId: string, targetThreadId: string, movedById: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, isFirstPost: true },
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (post.isFirstPost) throw new BadRequestException('Không thể chuyển bài gốc của thread');
    const target = await this.prisma.thread.findUnique({ where: { id: targetThreadId }, select: { id: true } });
    if (!target) throw new NotFoundException('Thread đích không tồn tại');

    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { threadId: targetThreadId, parentId: null } }),
      this.prisma.thread.update({ where: { id: post.threadId }, data: { replyCount: { decrement: 1 } } }),
      this.prisma.thread.update({ where: { id: targetThreadId }, data: { replyCount: { increment: 1 }, lastPostAt: new Date() } }),
    ]);
    return { ok: true, newThreadId: targetThreadId };
  }

  // ──────────────────────────────────────────────
  // WARNING AUTO-BAN
  // ──────────────────────────────────────────────

  async warnUser(dto: { userId: string; warnedById: string; reason: string; points?: number; postId?: string; threadId?: string; expiresAt?: Date }) {
    const warning = await this.prisma.userWarning.create({
      data: {
        userId: dto.userId,
        warnedById: dto.warnedById,
        reason: dto.reason,
        points: dto.points ?? 1,
        postId: dto.postId ?? null,
        threadId: dto.threadId ?? null,
        expiresAt: dto.expiresAt ?? null,
      },
    });

    // Tính tổng điểm cảnh cáo còn hiệu lực
    const activeWarnings = await this.prisma.userWarning.findMany({
      where: { userId: dto.userId, isExpired: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { points: true },
    });
    const totalPoints = activeWarnings.reduce((sum, w) => sum + w.points, 0);

    // Auto-ban nếu vượt ngưỡng (cấu hình từ DB, mặc định 10 điểm = ban 7 ngày)
    if (totalPoints >= 10) {
      const bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { bannedUntil, banReason: `Tự động cấm vì tích lũy ${totalPoints} điểm cảnh cáo` },
      });
      await this.notifications.notify(dto.userId, {
        type: 'SYSTEM',
        title: 'Tài khoản bị đình chỉ',
        body: `Bạn đã tích lũy ${totalPoints} điểm cảnh cáo. Tài khoản bị đình chỉ đến ${bannedUntil.toLocaleDateString('vi')}.`,
        link: '/settings/account',
      }).catch(() => {});
    } else {
      // Gửi thông báo cảnh cáo
      await this.notifications.notify(dto.userId, {
        type: 'SYSTEM',
        title: '⚠️ Bạn nhận được cảnh cáo',
        body: dto.reason,
        link: '/settings/account',
        actorId: dto.warnedById,
      }).catch(() => {});
    }

    return { warning, totalPoints };
  }

  async getUserWarnings(userId: string) {
    return this.prisma.userWarning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { warnedBy: { select: { id: true, username: true, displayName: true } } },
    });
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let slug = slugify(title, { lower: true, strict: true, locale: 'vi' });
    const exists = await this.prisma.thread.findUnique({ where: { slug } });
    if (exists && exists.id !== excludeId) slug = `${slug}-${createId().slice(0, 6)}`;
    return slug;
  }

  // Nội dung từ TipTap là HTML; nội dung cũ là Markdown/BBCode.
  private isHtmlContent(raw: string): boolean {
    return /<\/?(p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|table|img|a|br|strong|em|u|s|details|iframe|mark)\b/i.test(raw);
  }

  private async renderContent(raw: string): Promise<string> {
    if (this.isHtmlContent(raw)) {
      // Nội dung HTML từ TipTap: vẫn cho phép BBCode ([b]…[/b]) gõ tay trong editor.
      return this.text.censorHtml(this.text.sanitizeRichHtml(this.text.applyBBCode(raw)));
    }
    const censored = await this.text.censor(raw);
    return marked.parse(this.text.applyBBCode(censored)) as string;
  }

  // Render + lọc từ cấm + BBCode/HTML + link @mention, trả về cả danh sách user được nhắc
  private async buildContent(raw: string, excludeUserId: string): Promise<{ html: string; mentioned: { id: string; username: string }[] }> {
    let html: string;
    if (this.isHtmlContent(raw)) {
      html = await this.text.censorHtml(this.text.sanitizeRichHtml(this.text.applyBBCode(raw)));
    } else {
      const censored = await this.text.censor(raw);
      html = marked.parse(this.text.applyBBCode(censored)) as string;
    }
    const usernames = this.text.extractMentions(raw);
    const mentioned = await this.text.resolveMentionedUsers(usernames, excludeUserId);
    if (mentioned.length) {
      const map = new Map(mentioned.map((u) => [u.username.toLowerCase(), u.username]));
      html = this.text.linkMentions(html, map);
    }
    return { html, mentioned };
  }

  private async notifyMentions(mentioned: { id: string }[], actorId: string, threadTitle: string, link: string) {
    await Promise.all(mentioned.map((u) =>
      this.notifications.notify(u.id, {
        type: 'POST_MENTION',
        title: 'Bạn được nhắc đến trong một bài viết',
        body: threadTitle,
        link,
        actorId,
      }).catch(() => {}),
    ));
  }

  // ──────────────────────────────────────────────
  // BEST ANSWER (Q&A) — chọn câu trả lời hay nhất
  // ──────────────────────────────────────────────
  async toggleBestAnswer(threadId: string, postId: string, userId: string, role: Role) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, authorId: true, bestAnswerId: true, slug: true, title: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const isMod = role === Role.ADMIN || role === Role.MODERATOR;
    if (thread.authorId !== userId && !isMod) throw new ForbiddenException('Chỉ tác giả hoặc mod chọn câu trả lời hay nhất');

    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true, threadId: true, authorId: true, isFirstPost: true } });
    if (!post || post.threadId !== threadId) throw new NotFoundException('Post không thuộc thread này');
    if (post.isFirstPost) throw new BadRequestException('Không thể chọn bài gốc làm câu trả lời');

    // Bỏ chọn bài cũ
    if (thread.bestAnswerId) {
      await this.prisma.post.update({ where: { id: thread.bestAnswerId }, data: { isHelpful: false } }).catch(() => {});
    }

    // Toggle: nếu bấm lại đúng bài đang chọn → bỏ chọn
    if (thread.bestAnswerId === postId) {
      await this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: null, bestAnswerAuto: false } });
      return { bestAnswerId: null };
    }

    await this.prisma.$transaction([
      // bestAnswerAuto=false → khoá lựa chọn thủ công, auto sẽ không ghi đè
      this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: postId, bestAnswerAuto: false } }),
      this.prisma.post.update({ where: { id: postId }, data: { isHelpful: true } }),
    ]);

    // Thưởng EXP + thông báo cho người trả lời
    if (post.authorId !== userId) {
      await this.character.addForumExp(post.authorId, 15, 'best_answer').catch(() => {});
      await this.notifications.notify(post.authorId, {
        type: 'BEST_ANSWER',
        title: 'Câu trả lời của bạn được chọn là hay nhất! 🏆',
        body: thread.title,
        link: `/forum/${thread.slug}#post-${postId}`,
        actorId: userId,
      }).catch(() => {});
    }
    await this.trophy.checkAndAward(post.authorId).catch(() => {});

    return { bestAnswerId: postId };
  }

  // ── Vote Up/Down ────────────────────────────────────────────
  async votePost(postId: string, userId: string, value: 1 | -1) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, isDeleted: true },
    });
    if (!post || post.isDeleted) throw new Error('Bài viết không tồn tại');

    const existing = await this.prisma.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    let delta = 0;
    if (existing) {
      if (existing.value === value) {
        // Bấm lại cùng hướng → bỏ vote
        await this.prisma.postVote.delete({ where: { postId_userId: { postId, userId } } });
        delta = -value;
      } else {
        // Đổi hướng
        await this.prisma.postVote.update({ where: { postId_userId: { postId, userId } }, data: { value } });
        delta = value * 2;
      }
    } else {
      await this.prisma.postVote.create({ data: { postId, userId, value } });
      delta = value;
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { voteScore: { increment: delta } },
      select: { voteScore: true },
    });

    return { voteScore: updated.voteScore, userVote: existing?.value === value ? 0 : value };
  }

  async getPostVote(postId: string, userId: string) {
    const v = await this.prisma.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { value: true },
    });
    return { userVote: v?.value ?? 0 };
  }
}
