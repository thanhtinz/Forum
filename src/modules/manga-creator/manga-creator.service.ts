import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentService } from '../media/attachment.service';
import {
  MangaPublishStatus,
  ChapterPublishStatus,
  MediaType,
  MediaStatus,
} from '@prisma/client';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateSeriesDto {
  title: string;
  titleEnglish?: string;
  titleNative?: string;
  description?: string;
  language?: string;
  ageRating?: number;
}

export interface UpdateSeriesDto {
  title?: string;
  titleEnglish?: string;
  titleNative?: string;
  description?: string;
  language?: string;
  ageRating?: number;
  status?: MediaStatus;
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
    return media;
  }

  async createSeries(userId: string, dto: CreateSeriesDto) {
    const slug = `${makeSlug(dto.title)}-${Date.now()}`;
    const ageRating = dto.ageRating ?? 0;
    return this.prisma.mediaWork.create({
      data: {
        type: MediaType.MANGA,
        slug,
        title: dto.title,
        titleEnglish: dto.titleEnglish,
        titleNative: dto.titleNative,
        description: dto.description,
        language: dto.language ?? 'vi',
        ageRating,
        isAdult: ageRating >= 18,
        publishStatus: MangaPublishStatus.DRAFT,
        creatorId: userId,
      },
    });
  }

  async updateSeries(id: string, userId: string, dto: UpdateSeriesDto) {
    await this.assertSeriesOwner(id, userId);
    const ageRating = dto.ageRating;
    return this.prisma.mediaWork.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.titleEnglish !== undefined && { titleEnglish: dto.titleEnglish }),
        ...(dto.titleNative !== undefined && { titleNative: dto.titleNative }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(ageRating !== undefined && {
          ageRating,
          isAdult: ageRating >= 18,
        }),
      },
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

  // ── Creator: Chapters ────────────────────────────────────────────────────

  async listChapters(mediaId: string, userId: string) {
    await this.assertSeriesOwner(mediaId, userId);
    return this.prisma.chapter.findMany({
      where: { mediaId },
      orderBy: { number: 'asc' },
    });
  }

  async createChapter(mediaId: string, userId: string, dto: CreateChapterDto) {
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
    return this.prisma.mediaWork.update({
      where: { id },
      data: {
        publishStatus,
        ...(adminNote !== undefined && { description: adminNote }),
      },
      select: { id: true, publishStatus: true },
    });
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
    return this.prisma.chapter.update({
      where: { id },
      data: { chapterStatus },
      select: { id: true, chapterStatus: true },
    });
  }

  async getChapter(id: string, userId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) throw new NotFoundException('Không tìm thấy chapter');
    if (chapter.uploaderId !== userId)
      throw new ForbiddenException('Bạn không có quyền xem chapter này');
    return chapter;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertSeriesOwner(id: string, userId: string) {
    const media = await this.prisma.mediaWork.findUnique({
      where: { id },
      select: { creatorId: true },
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
}
