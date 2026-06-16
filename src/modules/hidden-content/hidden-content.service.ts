import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiddenGateType } from '@prisma/client';
import {
  CreateHiddenSectionDto,
  HiddenSectionResponseDto,
} from './hidden-content.dto';
import { marked } from 'marked';

@Injectable()
export class HiddenContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // TẠO HIDDEN SECTION (gọi khi tạo/edit post)
  // ──────────────────────────────────────────────
  async createSection(dto: CreateHiddenSectionDto, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (post.authorId !== authorId)
      throw new ForbiddenException('Chỉ tác giả mới có thể thêm nội dung ẩn');

    this.validateGateConditions(dto);

    const content = await this.renderContent(dto.contentRaw);

    return this.prisma.hiddenSection.create({
      data: {
        postId: dto.postId,
        sortOrder: dto.sortOrder ?? 0,
        label: dto.label,
        content,
        contentRaw: dto.contentRaw,
        gateType: dto.gateType,
        likeRequired: dto.likeRequired ?? null,
        commentRequired: dto.commentRequired ?? null,
        gemPrice: dto.gemPrice ?? null,
      },
    });
  }

  // ──────────────────────────────────────────────
  // LẤY TẤT CẢ HIDDEN SECTIONS CỦA MỘT POST
  // kèm trạng thái unlock của user hiện tại
  // ──────────────────────────────────────────────
  async getSectionsForPost(
    postId: string,
    userId: string | null,
    threadId: string,
  ): Promise<HiddenSectionResponseDto[]> {
    const sections = await this.prisma.hiddenSection.findMany({
      where: { postId },
      orderBy: { sortOrder: 'asc' },
    });

    if (sections.length === 0) return [];

    // Lấy thống kê thread (likes post đầu + reply count)
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        likeCount: true,
        thread: { select: { replyCount: true } },
      },
    });

    const currentLikes = post?.likeCount ?? 0;
    const currentComments = post?.thread?.replyCount ?? 0;

    // Lấy unlocks của user này
    let userUnlocks: Record<string, { unlockedVia: string }> = {};
    if (userId) {
      const unlocks = await this.prisma.hiddenContentUnlock.findMany({
        where: {
          userId,
          hiddenSectionId: { in: sections.map((s) => s.id) },
        },
        select: { hiddenSectionId: true, unlockedVia: true },
      });
      userUnlocks = Object.fromEntries(
        unlocks.map((u) => [u.hiddenSectionId, { unlockedVia: u.unlockedVia }]),
      );
    }

    return sections.map((section) => {
      const existingUnlock = userUnlocks[section.id];
      const conditionMet =
        userId != null &&
        this.checkConditionMet(section, currentLikes, currentComments);

      const isUnlocked = !!existingUnlock || conditionMet;

      // Nếu điều kiện vừa đủ nhưng chưa có record unlock → tự động tạo (lazy)
      // Sẽ được xử lý bằng background job hoặc khi user request
      return {
        id: section.id,
        postId: section.postId,
        sortOrder: section.sortOrder,
        label: section.label,
        gateType: section.gateType,
        likeRequired: section.likeRequired,
        commentRequired: section.commentRequired,
        gemPrice: section.gemPrice,
        unlockCount: section.unlockCount,
        isUnlocked,
        unlockedVia: existingUnlock?.unlockedVia,
        content: isUnlocked ? section.content : undefined,
        currentLikes,
        currentComments,
      };
    });
  }

  // ──────────────────────────────────────────────
  // UNLOCK CHỦ ĐỘNG (user nhấn nút "Mở khoá bằng Gem")
  // ──────────────────────────────────────────────
  async unlockWithGem(hiddenSectionId: string, userId: string): Promise<HiddenSectionResponseDto> {
    const section = await this.prisma.hiddenSection.findUnique({
      where: { id: hiddenSectionId },
      include: { post: { select: { likeCount: true, thread: { select: { replyCount: true } } } } },
    });
    if (!section) throw new NotFoundException('Không tìm thấy nội dung ẩn');

    // Kiểm tra gate type có hỗ trợ gem không
    const gemGates: HiddenGateType[] = [
      HiddenGateType.GEM_PURCHASE,
      HiddenGateType.LIKE_OR_GEM,
      HiddenGateType.COMMENT_OR_GEM,
    ];
    if (!gemGates.includes(section.gateType)) {
      throw new BadRequestException('Nội dung này không hỗ trợ mở khoá bằng Gem');
    }
    if (!section.gemPrice) throw new BadRequestException('Chưa thiết lập giá Gem');

    // Kiểm tra đã unlock chưa
    const existing = await this.prisma.hiddenContentUnlock.findUnique({
      where: { userId_hiddenSectionId: { userId, hiddenSectionId } },
    });
    if (existing) throw new BadRequestException('Bạn đã mở khoá nội dung này rồi');

    // Kiểm tra có thể unlock miễn phí bằng điều kiện không (ưu tiên)
    const currentLikes = section.post.likeCount;
    const currentComments = section.post.thread?.replyCount ?? 0;
    if (this.checkConditionMet(section, currentLikes, currentComments)) {
      return this.autoUnlock(section.id, userId, currentLikes, currentComments);
    }

    // Trừ gem
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gemBalance: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (user.gemBalance < section.gemPrice) {
      throw new BadRequestException(
        `Không đủ Gem. Cần ${section.gemPrice} Gem, bạn có ${user.gemBalance} Gem`,
      );
    }

    // Transaction: trừ gem + tạo unlock record + log
    await this.prisma.$transaction(async (tx) => {
      // Trừ gem user
      await tx.user.update({
        where: { id: userId },
        data: { gemBalance: { decrement: section.gemPrice! } },
      });

      // Log giao dịch gem
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { gemBalance: true },
      });
      await tx.gemTransaction.create({
        data: {
          userId,
          type: 'SPEND_HIDDEN_CONTENT',
          amount: -section.gemPrice!,
          balanceBefore: user.gemBalance,
          balanceAfter: updatedUser!.gemBalance,
          refId: section.id,
          refType: 'hidden_section',
          note: `Mở khoá nội dung ẩn`,
        },
      });

      // Tạo unlock record
      await tx.hiddenContentUnlock.create({
        data: {
          userId,
          hiddenSectionId: section.id,
          unlockedVia: 'gem',
          gemSpent: section.gemPrice!,
        },
      });

      // Tăng counter
      await tx.hiddenSection.update({
        where: { id: section.id },
        data: { unlockCount: { increment: 1 } },
      });

      // Thưởng gem cho tác giả bài viết (70% sau fee platform 30%)
      const post = await tx.post.findUnique({
        where: { id: section.postId },
        select: { authorId: true },
      });
      if (post && post.authorId !== userId) {
        const authorEarned = Math.floor(section.gemPrice! * 0.7);
        await tx.user.update({
          where: { id: post.authorId },
          data: { gemBalance: { increment: authorEarned } },
        });
        const authorUser = await tx.user.findUnique({
          where: { id: post.authorId },
          select: { gemBalance: true },
        });
        await tx.gemTransaction.create({
          data: {
            userId: post.authorId,
            type: 'EARN_SELL',
            amount: authorEarned,
            balanceBefore: authorUser!.gemBalance - authorEarned,
            balanceAfter: authorUser!.gemBalance,
            refId: section.id,
            refType: 'hidden_section',
            note: `Thu nhập từ nội dung ẩn`,
          },
        });
      }
    });

    return {
      id: section.id,
      postId: section.postId,
      sortOrder: section.sortOrder,
      label: section.label,
      gateType: section.gateType,
      likeRequired: section.likeRequired,
      commentRequired: section.commentRequired,
      gemPrice: section.gemPrice,
      unlockCount: section.unlockCount + 1,
      isUnlocked: true,
      unlockedVia: 'gem',
      content: section.content,
      currentLikes,
      currentComments,
    };
  }

  // ──────────────────────────────────────────────
  // AUTO-UNLOCK: gọi sau khi user like hoặc comment
  // Được invoke từ ForumService khi có like/comment mới
  // ──────────────────────────────────────────────
  async checkAndAutoUnlock(
    postId: string,
    userId: string,
    currentLikes: number,
    currentComments: number,
  ) {
    const sections = await this.prisma.hiddenSection.findMany({
      where: {
        postId,
        gateType: {
          in: [
            HiddenGateType.LIKE_REQUIRED,
            HiddenGateType.COMMENT_REQUIRED,
            HiddenGateType.LIKE_AND_COMMENT,
            HiddenGateType.LIKE_OR_COMMENT,
            HiddenGateType.LIKE_OR_GEM,
            HiddenGateType.COMMENT_OR_GEM,
          ],
        },
      },
    });

    const results: string[] = [];

    for (const section of sections) {
      // Bỏ qua nếu đã unlock
      const existing = await this.prisma.hiddenContentUnlock.findUnique({
        where: { userId_hiddenSectionId: { userId, hiddenSectionId: section.id } },
      });
      if (existing) continue;

      if (this.checkConditionMet(section, currentLikes, currentComments)) {
        const via = this.resolveUnlockVia(section, currentLikes, currentComments);
        await this.autoUnlock(section.id, userId, currentLikes, currentComments, via);
        results.push(section.id);
      }
    }

    return results; // trả về list section IDs vừa được unlock → emit WS event
  }

  // ──────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────

  private checkConditionMet(
    section: { gateType: HiddenGateType; likeRequired: number | null; commentRequired: number | null },
    likes: number,
    comments: number,
  ): boolean {
    switch (section.gateType) {
      case HiddenGateType.LIKE_REQUIRED:
        return likes >= (section.likeRequired ?? Infinity);
      case HiddenGateType.COMMENT_REQUIRED:
        return comments >= (section.commentRequired ?? Infinity);
      case HiddenGateType.LIKE_AND_COMMENT:
        return (
          likes >= (section.likeRequired ?? Infinity) &&
          comments >= (section.commentRequired ?? Infinity)
        );
      case HiddenGateType.LIKE_OR_COMMENT:
        return (
          likes >= (section.likeRequired ?? Infinity) ||
          comments >= (section.commentRequired ?? Infinity)
        );
      case HiddenGateType.LIKE_OR_GEM:
        return likes >= (section.likeRequired ?? Infinity);
      case HiddenGateType.COMMENT_OR_GEM:
        return comments >= (section.commentRequired ?? Infinity);
      default:
        return false; // GEM_PURCHASE phải dùng unlockWithGem
    }
  }

  private resolveUnlockVia(
    section: { gateType: HiddenGateType; likeRequired: number | null; commentRequired: number | null },
    likes: number,
    comments: number,
  ): string {
    if (
      section.gateType === HiddenGateType.LIKE_OR_COMMENT ||
      section.gateType === HiddenGateType.LIKE_AND_COMMENT
    ) {
      if (likes >= (section.likeRequired ?? Infinity) && comments >= (section.commentRequired ?? Infinity)) {
        return 'like_and_comment';
      }
      if (likes >= (section.likeRequired ?? Infinity)) return 'like';
      return 'comment';
    }
    if (section.gateType === HiddenGateType.LIKE_REQUIRED || section.gateType === HiddenGateType.LIKE_OR_GEM)
      return 'like';
    if (section.gateType === HiddenGateType.COMMENT_REQUIRED || section.gateType === HiddenGateType.COMMENT_OR_GEM)
      return 'comment';
    return 'auto';
  }

  private async autoUnlock(
    hiddenSectionId: string,
    userId: string,
    currentLikes: number,
    currentComments: number,
    via = 'auto',
  ): Promise<HiddenSectionResponseDto> {
    const section = await this.prisma.hiddenSection.findUnique({
      where: { id: hiddenSectionId },
    });
    if (!section) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.hiddenContentUnlock.upsert({
        where: { userId_hiddenSectionId: { userId, hiddenSectionId } },
        update: {},
        create: { userId, hiddenSectionId, unlockedVia: via, gemSpent: 0 },
      }),
      this.prisma.hiddenSection.update({
        where: { id: hiddenSectionId },
        data: { unlockCount: { increment: 1 } },
      }),
    ]);

    return {
      id: section.id,
      postId: section.postId,
      sortOrder: section.sortOrder,
      label: section.label,
      gateType: section.gateType,
      likeRequired: section.likeRequired,
      commentRequired: section.commentRequired,
      gemPrice: section.gemPrice,
      unlockCount: section.unlockCount + 1,
      isUnlocked: true,
      unlockedVia: via,
      content: section.content,
      currentLikes,
      currentComments,
    };
  }

  private validateGateConditions(dto: CreateHiddenSectionDto) {
    switch (dto.gateType) {
      case HiddenGateType.LIKE_REQUIRED:
        if (!dto.likeRequired) throw new BadRequestException('Cần chỉ định số like tối thiểu');
        break;
      case HiddenGateType.COMMENT_REQUIRED:
        if (!dto.commentRequired) throw new BadRequestException('Cần chỉ định số bình luận tối thiểu');
        break;
      case HiddenGateType.LIKE_AND_COMMENT:
      case HiddenGateType.LIKE_OR_COMMENT:
        if (!dto.likeRequired || !dto.commentRequired)
          throw new BadRequestException('Cần chỉ định cả số like và bình luận');
        break;
      case HiddenGateType.GEM_PURCHASE:
        if (!dto.gemPrice) throw new BadRequestException('Cần chỉ định giá Gem');
        break;
      case HiddenGateType.LIKE_OR_GEM:
        if (!dto.likeRequired || !dto.gemPrice)
          throw new BadRequestException('Cần chỉ định số like và giá Gem');
        break;
      case HiddenGateType.COMMENT_OR_GEM:
        if (!dto.commentRequired || !dto.gemPrice)
          throw new BadRequestException('Cần chỉ định số bình luận và giá Gem');
        break;
    }
  }

  private async renderContent(raw: string): Promise<string> {
    // Dùng marked để render Markdown; có thể thêm BBCode parser sau
    return marked.parse(raw) as string;
  }
}
