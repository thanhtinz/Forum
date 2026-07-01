import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} as const;

export interface CreateAlbumDto {
  title: string;
  description?: string;
  coverUrl?: string;
}

export interface UpdateAlbumDto {
  title?: string;
  description?: string;
  coverUrl?: string;
}

export interface AddMediaDto {
  url: string;
  caption?: string;
}

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  private isMod(role?: UserRole) {
    return role === UserRole.ADMIN || role === UserRole.MODERATOR;
  }

  // ── Albums ──
  async createAlbum(ownerId: string, dto: CreateAlbumDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Tiêu đề album không được để trống');
    return this.prisma.galleryAlbum.create({
      data: {
        ownerId,
        title,
        description: dto.description?.trim() || null,
        coverUrl: dto.coverUrl?.trim() || null,
      },
    });
  }

  async updateAlbum(
    albumId: string,
    userId: string,
    userRole: UserRole | undefined,
    data: UpdateAlbumDto,
  ) {
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    if (album.ownerId !== userId && !this.isMod(userRole)) {
      throw new ForbiddenException('Bạn không có quyền sửa album này');
    }
    const patch: any = {};
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new BadRequestException('Tiêu đề album không được để trống');
      patch.title = title;
    }
    if (data.description !== undefined) patch.description = data.description.trim() || null;
    if (data.coverUrl !== undefined) patch.coverUrl = data.coverUrl.trim() || null;
    return this.prisma.galleryAlbum.update({ where: { id: albumId }, data: patch });
  }

  async deleteAlbum(albumId: string, userId: string, userRole: UserRole | undefined) {
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    if (album.ownerId !== userId && !this.isMod(userRole)) {
      throw new ForbiddenException('Bạn không có quyền xoá album này');
    }
    await this.prisma.galleryAlbum.delete({ where: { id: albumId } });
    return { success: true };
  }

  async listAlbums(query: { page?: number; limit?: number; ownerId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.ownerId) where.ownerId = query.ownerId;

    const [albums, total] = await Promise.all([
      this.prisma.galleryAlbum.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: OWNER_SELECT } },
      }),
      this.prisma.galleryAlbum.count({ where }),
    ]);

    return {
      data: albums,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAlbum(albumId: string) {
    const album = await this.prisma.galleryAlbum.findUnique({
      where: { id: albumId },
      include: {
        owner: { select: OWNER_SELECT },
        media: {
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: OWNER_SELECT } },
        },
      },
    });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    return album;
  }

  // ── Media ──
  async addMedia(
    albumId: string,
    ownerId: string,
    userRole: UserRole | undefined,
    dto: AddMediaDto,
  ) {
    const url = dto.url?.trim();
    if (!url) throw new BadRequestException('URL ảnh không được để trống');
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    if (album.ownerId !== ownerId && !this.isMod(userRole)) {
      throw new ForbiddenException('Bạn không có quyền thêm ảnh vào album này');
    }

    const [media] = await this.prisma.$transaction([
      this.prisma.galleryMedia.create({
        data: {
          albumId,
          ownerId: album.ownerId,
          url,
          caption: dto.caption?.trim() || null,
        },
      }),
      this.prisma.galleryAlbum.update({
        where: { id: albumId },
        data: {
          mediaCount: { increment: 1 },
          ...(album.coverUrl ? {} : { coverUrl: url }),
        },
      }),
    ]);
    return media;
  }

  async deleteMedia(mediaId: string, userId: string, userRole: UserRole | undefined) {
    const media = await this.prisma.galleryMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Không tìm thấy ảnh');
    if (media.ownerId !== userId && !this.isMod(userRole)) {
      throw new ForbiddenException('Bạn không có quyền xoá ảnh này');
    }
    await this.prisma.$transaction([
      this.prisma.galleryMedia.delete({ where: { id: mediaId } }),
      this.prisma.galleryAlbum.update({
        where: { id: media.albumId },
        data: { mediaCount: { decrement: 1 } },
      }),
    ]);
    return { success: true };
  }

  async getMedia(mediaId: string) {
    const media = await this.prisma.galleryMedia.findUnique({
      where: { id: mediaId },
      include: {
        owner: { select: OWNER_SELECT },
        album: { select: { id: true, title: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: OWNER_SELECT } },
        },
      },
    });
    if (!media) throw new NotFoundException('Không tìm thấy ảnh');
    // Tăng lượt xem (không chặn response)
    this.prisma.galleryMedia
      .update({ where: { id: mediaId }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
    return media;
  }

  async likeMedia(mediaId: string) {
    const media = await this.prisma.galleryMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Không tìm thấy ảnh');
    return this.prisma.galleryMedia.update({
      where: { id: mediaId },
      data: { likeCount: { increment: 1 } },
    });
  }

  async listRecentMedia(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 60);
    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      this.prisma.galleryMedia.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: OWNER_SELECT },
          album: { select: { id: true, title: true } },
        },
      }),
      this.prisma.galleryMedia.count(),
    ]);

    return {
      data: media,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Comments ──
  async addComment(mediaId: string, authorId: string, content: string) {
    const text = content?.trim();
    if (!text) throw new BadRequestException('Bình luận không được để trống');
    const media = await this.prisma.galleryMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Không tìm thấy ảnh');
    return this.prisma.galleryComment.create({
      data: { mediaId, authorId, content: text },
      include: { author: { select: OWNER_SELECT } },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: UserRole | undefined) {
    const comment = await this.prisma.galleryComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    if (comment.authorId !== userId && !this.isMod(userRole)) {
      throw new ForbiddenException('Bạn không có quyền xoá bình luận này');
    }
    await this.prisma.galleryComment.delete({ where: { id: commentId } });
    return { success: true };
  }
}
