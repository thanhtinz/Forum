import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentService } from '../media/attachment.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MangaPublishStatus,
  ChapterPublishStatus,
  MediaType,
  MediaStatus,
} from '@prisma/client';
// CreatorStatus is used as string literals ('PENDING'|'APPROVED'|'REJECTED') to avoid
// circular import issues at compile time; the enum is validated by Prisma at runtime.

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateSeriesDto {
  title: string;
  titleEnglish?: string;
  titleNative?: string;
  synonyms?: string[];
  description?: string;
  language?: string;
  ageRating?: number;
  format?: string;
  type?: string;
  genreNames?: string[];
  tags?: string[];
  author?: string;
  artist?: string;
  publisher?: string;
  countryOfOrigin?: string;
  seasonYear?: number;
  status?: string;
  allowComments?: boolean;
  allowRating?: boolean;
  allowFollow?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface UpdateSeriesDto {
  title?: string;
  slug?: string;
  titleEnglish?: string;
  titleNative?: string;
  synonyms?: string[];
  description?: string;
  language?: string;
  ageRating?: number;
  format?: string;
  seasonYear?: number;
  status?: MediaStatus;
  publisher?: string;
  author?: string;
  artist?: string;
  tags?: string[];
  countryOfOrigin?: string;
  genreNames?: string[];
  allowComments?: boolean;
  allowRating?: boolean;
  allowFollow?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface CreateChapterDto {
  number: number;
  title?: string;
  volume?: number;
  scheduledAt?: string;
}

export interface UpdateChapterDto {
  number?: number;
  title?: string;
  volume?: number;
  scheduledAt?: string;
  content?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Vietnamese-aware slugify, trimmed to 80 chars.
 */
function makeSlug(title: string): string {
  const map: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ả: 'a', ạ: 'a',
    ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ê: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ỏ: 'o', ọ: 'o',
    ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', ư: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
    ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
    đ: 'd',
    // uppercase
    À: 'a', Á: 'a', Â: 'a', Ã: 'a', Ả: 'a', Ạ: 'a',
    Ă: 'a', Ắ: 'a', Ặ: 'a', Ằ: 'a', Ẳ: 'a', Ẵ: 'a',
    Ấ: 'a', Ầ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a',
    È: 'e', É: 'e', Ê: 'e', Ẻ: 'e', Ẽ: 'e', Ẹ: 'e',
    Ế: 'e', Ề: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e',
    Ì: 'i', Í: 'i', Ỉ: 'i', Ĩ: 'i', Ị: 'i',
    Ò: 'o', Ó: 'o', Ô: 'o', Õ: 'o', Ỏ: 'o', Ọ: 'o',
    Ố: 'o', Ồ: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
    Ơ: 'o', Ớ: 'o', Ờ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o',
    Ù: 'u', Ú: 'u', Ư: 'u', Ủ: 'u', Ũ: 'u', Ụ: 'u',
    Ứ: 'u', Ừ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u',
    Ỳ: 'y', Ý: 'y', Ỷ: 'y', Ỹ: 'y', Ỵ: 'y',
    Đ: 'd',
  };
  return title
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class MangaCreatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachment: AttachmentService,
    private readonly notif: NotificationsService,
  ) {}

  // ── Creator: Series ──────────────────────────────────────────────────────

  async listMySeries(userId: string) {
    return this.prisma.mediaWork.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEnglish: true,
        coverUrl: true,
        publishStatus: true,
        format: true,
        type: true,
        language: true,
        ageRating: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { chapterList: true } },
      },
    });
  }

  async getSeries(id: string, userId: string) {
    const media = await this.prisma.mediaWork.findUnique({
      where: { id },
      include: {
        genres: { select: { name: true, slug: true } },
        chapterList: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            volume: true,
            chapterStatus: true,
            scheduledAt: true,
            viewCount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!media) throw new NotFoundException('Không tìm thấy series');
    if (media.creatorId !== userId)
      throw new ForbiddenException('Bạn không có quyền xem series này');
    return {
      ...media,
      tags: (media as any).tags ?? [],
      allowComments: (media as any).allowComments ?? true,
      allowRating: (media as any).allowRating ?? true,
      allowFollow: (media as any).allowFollow ?? true,
      seoTitle: (media as any).seoTitle ?? null,
      seoDescription: (media as any).seoDescription ?? null,
      seoKeywords: (media as any).seoKeywords ?? [],
      author: (media as any).author ?? null,
      artist: (media as any).artist ?? null,
    };
  }

  async createSeries(userId: string, dto: CreateSeriesDto) {
    await this.assertIsCreator(userId);
    const slug = `${makeSlug(dto.title)}-${Date.now()}`;
    const ageRating = dto.ageRating ?? 0;
    const mediaType = dto.type === 'DONGHUA' ? MediaType.DONGHUA
      : dto.type === 'MANHWA' ? MediaType.MANHWA
      : dto.type === 'MANGA' ? MediaType.MANGA
      : MediaType.MANHUA;
    const genres = dto.genreNames?.length
      ? { connectOrCreate: this.genreConnect(dto.genreNames) }
      : undefined;
    return this.prisma.mediaWork.create({
      data: {
        type: mediaType,
        slug,
        title: dto.title,
        titleEnglish: dto.titleEnglish,
        titleNative: dto.titleNative,
        synonyms: dto.synonyms ?? [],
        description: dto.description,
        language: dto.language ?? 'vi',
        ageRating,
        isAdult: ageRating >= 18,
        format: dto.format,
        status: (dto.status as MediaStatus) ?? MediaStatus.RELEASING,
        seasonYear: dto.seasonYear,
        publisher: dto.publisher,
        author: dto.author,
        artist: dto.artist,
        tags: dto.tags ?? [],
        countryOfOrigin: dto.countryOfOrigin,
        allowComments: dto.allowComments ?? true,
        allowRating: dto.allowRating ?? true,
        allowFollow: dto.allowFollow ?? true,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoKeywords: dto.seoKeywords ?? [],
        publishStatus: MangaPublishStatus.DRAFT,
        creatorId: userId,
        ...(genres && { genres }),
      },
    });
  }

  async updateSeries(id: string, userId: string, dto: UpdateSeriesDto) {
    await this.assertSeriesOwner(id, userId);
    const ageRating = dto.ageRating;
    // Validate slug uniqueness if provided
    if (dto.slug) {
      const clean = dto.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const existing = await this.prisma.mediaWork.findFirst({ where: { slug: clean, NOT: { id } } });
      if (existing) throw new Error('Slug này đã được sử dụng, hãy chọn slug khác');
      dto.slug = clean;
    }
    return this.prisma.mediaWork.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.titleEnglish !== undefined && { titleEnglish: dto.titleEnglish }),
        ...(dto.titleNative !== undefined && { titleNative: dto.titleNative }),
        ...(dto.synonyms !== undefined && { synonyms: dto.synonyms }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.format !== undefined && { format: dto.format || null }),
        ...(dto.seasonYear !== undefined && { seasonYear: dto.seasonYear || null }),
        ...(dto.publisher !== undefined && { publisher: dto.publisher || null }),
        ...(dto.author !== undefined && { author: dto.author || null }),
        ...(dto.artist !== undefined && { artist: dto.artist || null }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.countryOfOrigin !== undefined && { countryOfOrigin: dto.countryOfOrigin || null }),
        ...(dto.allowComments !== undefined && { allowComments: dto.allowComments }),
        ...(dto.allowRating !== undefined && { allowRating: dto.allowRating }),
        ...(dto.allowFollow !== undefined && { allowFollow: dto.allowFollow }),
        ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle || null }),
        ...(dto.seoDescription !== undefined && { seoDescription: dto.seoDescription || null }),
        ...(dto.seoKeywords !== undefined && { seoKeywords: dto.seoKeywords }),
        ...(ageRating !== undefined && {
          ageRating,
          isAdult: ageRating >= 18,
        }),
        ...(dto.genreNames !== undefined && {
          genres: { set: [], connectOrCreate: this.genreConnect(dto.genreNames) },
        }),
      },
    });
  }

  async uploadBanner(id: string, userId: string, file: any) {
    await this.assertSeriesOwner(id, userId);
    const result = await this.attachment.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'manga-covers',
    );
    return this.prisma.mediaWork.update({
      where: { id },
      data: { bannerUrl: result.url },
      select: { id: true, bannerUrl: true },
    });
  }

  async uploadCover(id: string, userId: string, file: any) {
    await this.assertSeriesOwner(id, userId);
    const result = await this.attachment.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'manga-covers',
    );
    return this.prisma.mediaWork.update({
      where: { id },
      data: { coverUrl: result.url },
      select: { id: true, coverUrl: true },
    });
  }

  async submitForReview(id: string, userId: string) {
    await this.assertSeriesOwner(id, userId);
    return this.prisma.mediaWork.update({
      where: { id },
      data: { publishStatus: MangaPublishStatus.PENDING },
      select: { id: true, publishStatus: true },
    });
  }

  async deleteSeries(id: string, userId: string) {
    await this.assertSeriesOwner(id, userId);
    await this.prisma.mediaWork.delete({ where: { id } });
    return { success: true };
  }

  async toggleVisibility(id: string, userId: string) {
    const work = await this.assertSeriesOwner(id, userId);
    const isHidden = work.publishStatus === MangaPublishStatus.DRAFT;
    const next = isHidden ? MangaPublishStatus.PUBLISHED : MangaPublishStatus.DRAFT;
    await this.prisma.mediaWork.update({ where: { id }, data: { publishStatus: next } });
    return { hidden: next === MangaPublishStatus.DRAFT };
  }

  async getCreatorStats(id: string, userId: string) {
    await this.assertSeriesOwner(id, userId);
    const [work, chapters] = await Promise.all([
      this.prisma.mediaWork.findUnique({ where: { id }, select: { viewCount: true, favoriteCount: true, ratingCount: true, avgScore: true } }),
      this.prisma.chapter.findMany({ where: { mediaId: id }, select: { viewCount: true, chapterStatus: true } }),
    ]);
    const totalViews = (work?.viewCount ?? 0) + chapters.reduce((s, c) => s + (c.viewCount ?? 0), 0);
    return {
      totalViews,
      chapterCount: chapters.length,
      publishedChapters: chapters.filter((c) => c.chapterStatus === 'PUBLISHED').length,
      favoriteCount: work?.favoriteCount ?? 0,
      ratingCount: work?.ratingCount ?? 0,
      avgScore: work?.avgScore ?? 0,
    };
  }

  // ── Creator: Chapters ────────────────────────────────────────────────────

  async listChapters(mediaId: string, userId: string) {
    await this.assertSeriesOwner(mediaId, userId);
    return this.prisma.chapter.findMany({
      where: { mediaId },
      orderBy: { number: 'asc' },
    });
  }

  async createChapter(mediaId: string, userId: string, dto: CreateChapterDto) {
    await this.assertIsCreator(userId);
    await this.assertSeriesOwner(mediaId, userId);
    return this.prisma.chapter.create({
      data: {
        mediaId,
        uploaderId: userId,
        number: dto.number,
        title: dto.title,
        volume: dto.volume,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        chapterStatus: ChapterPublishStatus.DRAFT,
      },
    });
  }

  async updateChapter(id: string, userId: string, dto: UpdateChapterDto) {
    await this.assertChapterOwner(id, userId);
    return this.prisma.chapter.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.volume !== undefined && { volume: dto.volume }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });
  }

  async uploadPages(
    chapterId: string,
    userId: string,
    files: any[],
  ) {
    await this.assertChapterOwner(chapterId, userId);
    const urls: string[] = [];
    for (const file of files) {
      const result = await this.attachment.upload(
        file.buffer,
        file.originalname,
        file.mimetype,
        'manga-pages',
      );
      urls.push(result.url);
    }
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { pages: true },
    });
    const updatedPages = [...(chapter?.pages ?? []), ...urls];
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { pages: updatedPages },
      select: { id: true, pages: true },
    });
  }

  async setPageOrder(chapterId: string, userId: string, pages: string[]) {
    await this.assertChapterOwner(chapterId, userId);
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { pages },
      select: { id: true, pages: true },
    });
  }

  async deleteChapter(id: string, userId: string) {
    await this.assertChapterOwner(id, userId);
    await this.prisma.chapter.delete({ where: { id } });
    return { success: true };
  }

  async publishChapter(chapterId: string, userId: string) {
    const chapter = await this.assertChapterOwner(chapterId, userId);
    const media = await this.prisma.mediaWork.findUnique({
      where: { id: chapter.mediaId },
      select: { publishStatus: true },
    });
    const newStatus =
      media?.publishStatus === MangaPublishStatus.PUBLISHED
        ? ChapterPublishStatus.PUBLISHED
        : ChapterPublishStatus.PENDING_REVIEW;
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { chapterStatus: newStatus },
      select: { id: true, chapterStatus: true },
    });
  }

  // ── Creator Registration ──────────────────────────────────────────────────

  async getMyApplicationStatus(userId: string) {
    const app = await this.prisma.creatorApplication.findUnique({
      where: { userId },
      select: { id: true, status: true, reason: true, portfolio: true, adminNote: true, createdAt: true },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isCreator: true } });
    return { application: app, isCreator: user?.isCreator ?? false };
  }

  async submitApplication(userId: string, dto: { reason: string; portfolio?: string }) {
    if (!dto.reason?.trim()) throw new Error('Vui lòng điền lý do muốn trở thành tác giả');
    // Check if user is already a creator
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isCreator: true } });
    if (user?.isCreator) return { alreadyCreator: true };

    // Upsert application (allow re-apply after rejection)
    return this.prisma.creatorApplication.upsert({
      where: { userId },
      create: { userId, reason: dto.reason.trim(), portfolio: dto.portfolio?.trim() || null, status: 'PENDING' },
      update: { reason: dto.reason.trim(), portfolio: dto.portfolio?.trim() || null, status: 'PENDING', adminNote: null },
      select: { id: true, status: true, createdAt: true },
    });
  }

  // ── Admin: Moderation ────────────────────────────────────────────────────

  async listPendingSeries() {
    return this.prisma.mediaWork.findMany({
      where: { publishStatus: MangaPublishStatus.PENDING },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async moderateSeries(id: string, action: 'approve' | 'reject', adminNote?: string) {
    const publishStatus =
      action === 'approve'
        ? MangaPublishStatus.PUBLISHED
        : MangaPublishStatus.REJECTED;
    const updated = await this.prisma.mediaWork.update({
      where: { id },
      data: {
        publishStatus,
        ...(adminNote !== undefined && { description: adminNote }),
      },
      select: { id: true, publishStatus: true, title: true, slug: true, creatorId: true },
    });
    if (updated.creatorId) {
      const approved = action === 'approve';
      this.notif.notify(updated.creatorId, {
        type: 'SYSTEM',
        title: approved ? `Series "${updated.title}" đã được duyệt ✓` : `Series "${updated.title}" bị từ chối`,
        body: adminNote || (approved ? 'Series của bạn đã được xuất bản.' : 'Vui lòng chỉnh sửa và gửi lại.'),
        link: `/manga/creator/edit?id=${updated.id}`,
      }).catch(() => {});
    }
    return updated;
  }

  async listPendingChapters() {
    return this.prisma.chapter.findMany({
      where: { chapterStatus: ChapterPublishStatus.PENDING_REVIEW },
      include: {
        media: {
          select: { id: true, title: true, slug: true, coverUrl: true },
        },
        uploader: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderateChapter(id: string, action: 'approve' | 'reject') {
    const chapterStatus =
      action === 'approve'
        ? ChapterPublishStatus.PUBLISHED
        : ChapterPublishStatus.DRAFT;
    const updated = await this.prisma.chapter.update({
      where: { id },
      data: { chapterStatus },
      select: { id: true, chapterStatus: true, number: true, uploaderId: true, mediaId: true, media: { select: { id: true, title: true } } },
    });
    if (updated.uploaderId) {
      const approved = action === 'approve';
      this.notif.notify(updated.uploaderId, {
        type: 'SYSTEM',
        title: approved
          ? `Chương ${updated.number} của "${(updated as any).media?.title}" đã được duyệt ✓`
          : `Chương ${updated.number} của "${(updated as any).media?.title}" bị từ chối`,
        body: approved ? 'Chương của bạn đã được xuất bản.' : 'Chương bị từ chối. Vui lòng chỉnh sửa lại.',
        link: `/manga/creator/chapter/new?chapterId=${updated.id}&mediaId=${updated.mediaId}`,
      }).catch(() => {});
    }
    return updated;
  }

  async listPendingApplications() {
    return this.prisma.creatorApplication.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true, createdAt: true, postCount: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderateApplication(id: string, action: 'approve' | 'reject', adminNote?: string) {
    const app = await this.prisma.creatorApplication.findUnique({ where: { id }, select: { userId: true, user: { select: { displayName: true, username: true } } } });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await this.prisma.creatorApplication.update({
      where: { id },
      data: { status, adminNote: adminNote?.trim() || null },
    });

    if (action === 'approve') {
      await this.prisma.user.update({ where: { id: app.userId }, data: { isCreator: true } });
    }

    this.notif.notify(app.userId, {
      type: 'SYSTEM',
      title: action === 'approve' ? 'Đơn đăng ký tác giả được duyệt ✓' : 'Đơn đăng ký tác giả bị từ chối',
      body: adminNote || (action === 'approve' ? 'Bạn đã được duyệt làm tác giả. Bắt đầu đăng truyện ngay!' : 'Đơn của bạn chưa được chấp thuận. Vui lòng thử lại sau.'),
      link: '/manga/creator',
    }).catch(() => {});

    return { id, status };
  }

  async getChapter(id: string, userId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) throw new NotFoundException('Không tìm thấy chapter');
    if (chapter.uploaderId !== userId)
      throw new ForbiddenException('Bạn không có quyền xem chapter này');
    return chapter;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertIsCreator(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isCreator: true, role: true } });
    if (!user?.isCreator && user?.role !== 'ADMIN')
      throw new ForbiddenException('Bạn chưa được duyệt làm tác giả. Vui lòng đăng ký trước.');
  }

  private async assertSeriesOwner(id: string, userId: string) {
    const media = await this.prisma.mediaWork.findUnique({
      where: { id },
      select: { creatorId: true, publishStatus: true },
    });
    if (!media) throw new NotFoundException('Không tìm thấy series');
    if (media.creatorId !== userId)
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    return media;
  }

  private async assertChapterOwner(id: string, userId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      select: { uploaderId: true, mediaId: true },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chapter');
    if (chapter.uploaderId !== userId)
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    return chapter;
  }

  private genreConnect(names: string[]) {
    return names.filter((n) => n?.trim()).map((n) => {
      const name = n.trim();
      const slug = makeSlug(name);
      return { where: { slug }, create: { slug, name } };
    });
  }
}
