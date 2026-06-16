import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SaveDraftDto {
  id?: string;
  threadId?: string;
  categoryId?: string;
  title?: string;
  content: string;
}

// FoF Drafts — lưu nháp bài viết / trả lời
@Injectable()
export class DraftService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, dto: SaveDraftDto) {
    const data = {
      threadId: dto.threadId ?? null,
      categoryId: dto.categoryId ?? null,
      title: dto.title?.slice(0, 255) ?? null,
      content: dto.content,
    };
    if (dto.id) {
      const existing = await this.prisma.postDraft.findUnique({ where: { id: dto.id } });
      if (!existing) throw new NotFoundException('Nháp không tồn tại');
      if (existing.userId !== userId) throw new ForbiddenException();
      return this.prisma.postDraft.update({ where: { id: dto.id }, data });
    }
    return this.prisma.postDraft.create({ data: { ...data, userId } });
  }

  async list(userId: string) {
    return this.prisma.postDraft.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async remove(id: string, userId: string) {
    const d = await this.prisma.postDraft.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Nháp không tồn tại');
    if (d.userId !== userId) throw new ForbiddenException();
    await this.prisma.postDraft.delete({ where: { id } });
    return { deleted: true };
  }
}
