import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SearchType = 'all' | 'thread' | 'post' | 'user';

export interface SearchFilters {
  author?: string; // username
  categoryId?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chỉ mục full-text (Postgres tsvector, cấu hình 'simple' — không cần từ điển
  // tiếng Việt riêng, vẫn tách từ theo khoảng trắng/dấu câu tốt hơn nhiều so với ILIKE).
  // Index dạng biểu thức nên không cần cột sinh thêm / không cần Prisma migration.
  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS thread_title_fts_idx ON "Thread" USING GIN (to_tsvector('simple', title))`,
      );
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS post_content_fts_idx ON "Post" USING GIN (to_tsvector('simple', "contentRaw"))`,
      );
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS user_name_fts_idx ON "User" USING GIN (to_tsvector('simple', username || ' ' || coalesce("displayName", '')))`,
      );
    } catch (e) {
      this.logger.warn(`Không tạo được chỉ mục full-text search: ${(e as Error).message}`);
    }
  }

  async search(query: string, type: SearchType = 'all', filters: SearchFilters = {}) {
    const q = query.trim();
    if (q.length < 2) {
      return { query: q, results: {} };
    }
    const page = Math.max(1, filters.page ?? 1);
    const take = Math.min(Math.max(filters.limit ?? 10, 1), 50);
    const skip = (page - 1) * take;

    let authorId: string | undefined;
    if (filters.author) {
      const u = await this.prisma.user.findUnique({ where: { username: filters.author }, select: { id: true } });
      authorId = u?.id;
      if (!authorId) return { query: q, results: {} }; // tác giả không tồn tại → chắc chắn rỗng
    }

    const wantAll = type === 'all';
    const tasks: Record<string, Promise<unknown>> = {};

    if (wantAll || type === 'thread') tasks.threads = this.searchThreads(q, take, skip, { authorId, categoryId: filters.categoryId, from: filters.from, to: filters.to });
    if (wantAll || type === 'post') tasks.posts = this.searchPosts(q, take, skip, { authorId, from: filters.from, to: filters.to });
    if (wantAll || type === 'user') tasks.users = this.searchUsers(q, take, skip);

    const keys = Object.keys(tasks);
    const values = await Promise.all(keys.map((k) => tasks[k]));
    const results: Record<string, unknown> = {};
    keys.forEach((k, i) => (results[k] = values[i]));

    return { query: q, page, limit: take, results };
  }

  private dateRangeSql(column: Prisma.Sql, from?: string, to?: string): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (from && !Number.isNaN(Date.parse(from))) parts.push(Prisma.sql`AND ${column} >= ${new Date(from)}`);
    if (to && !Number.isNaN(Date.parse(to))) parts.push(Prisma.sql`AND ${column} <= ${new Date(to)}`);
    if (!parts.length) return Prisma.empty;
    return parts.length === 1 ? parts[0] : Prisma.join(parts, ' ');
  }

  private async searchThreads(
    q: string,
    take: number,
    skip: number,
    filters: { authorId?: string; categoryId?: string; from?: string; to?: string },
  ) {
    const authorSql = filters.authorId ? Prisma.sql`AND t."authorId" = ${filters.authorId}` : Prisma.empty;
    const categorySql = filters.categoryId ? Prisma.sql`AND t."categoryId" = ${filters.categoryId}` : Prisma.empty;
    const dateSql = this.dateRangeSql(Prisma.sql`t."createdAt"`, filters.from, filters.to);

    return this.prisma.$queryRaw`
      SELECT t.id, t.title, t.slug, t."replyCount", t."viewCount", t."createdAt", t."isPinned",
        ts_rank(to_tsvector('simple', t.title), plainto_tsquery('simple', ${q})) AS rank
      FROM "Thread" t
      WHERE to_tsvector('simple', t.title) @@ plainto_tsquery('simple', ${q})
        AND t."isApproved" = true AND t."isHidden" = false
        ${authorSql} ${categorySql} ${dateSql}
      ORDER BY t."isPinned" DESC, rank DESC, t."createdAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  private async searchPosts(
    q: string,
    take: number,
    skip: number,
    filters: { authorId?: string; from?: string; to?: string },
  ) {
    const authorSql = filters.authorId ? Prisma.sql`AND p."authorId" = ${filters.authorId}` : Prisma.empty;
    const dateSql = this.dateRangeSql(Prisma.sql`p."createdAt"`, filters.from, filters.to);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.id, p."threadId", p."likeCount", p."createdAt",
        ts_rank(to_tsvector('simple', p."contentRaw"), plainto_tsquery('simple', ${q})) AS rank
      FROM "Post" p
      WHERE to_tsvector('simple', p."contentRaw") @@ plainto_tsquery('simple', ${q})
        AND p."isDeleted" = false AND p."isApproved" = true
        ${authorSql} ${dateSql}
      ORDER BY rank DESC, p."createdAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    if (!rows.length) return [];
    const [authors, threads] = await Promise.all([
      this.prisma.post.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true, author: { select: { id: true, username: true, displayName: true } } } }),
      this.prisma.thread.findMany({ where: { id: { in: rows.map((r) => r.threadId) } }, select: { id: true, slug: true, title: true } }),
    ]);
    const authorMap = new Map(authors.map((a) => [a.id, a.author]));
    const threadMap = new Map(threads.map((t) => [t.id, t]));
    return rows.map((r) => ({ ...r, author: authorMap.get(r.id), thread: threadMap.get(r.threadId) }));
  }

  private async searchUsers(q: string, take: number, skip: number) {
    return this.prisma.$queryRaw`
      SELECT id, username, "displayName", avatar, role,
        ts_rank(to_tsvector('simple', username || ' ' || coalesce("displayName", '')), plainto_tsquery('simple', ${q})) AS rank
      FROM "User"
      WHERE to_tsvector('simple', username || ' ' || coalesce("displayName", '')) @@ plainto_tsquery('simple', ${q})
        AND status = 'ACTIVE'
      ORDER BY rank DESC
      LIMIT ${take} OFFSET ${skip}
    `;
  }
}
