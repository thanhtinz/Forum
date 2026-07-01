import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Hiển thị ngày sinh theo định dạng đã chọn (giấu phần không muốn công khai)
function formatBirthday(d: Date, format: string): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear());
  switch (format) {
    case 'year': return year;
    case 'day_month': return `${day}/${month}`;
    case 'month_year': return `${month}/${year}`;
    default: return `${day}/${month}/${year}`;
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true, avatar: true, bio: true,
        location: true, birthday: true, showBirthday: true, birthdayFormat: true,
        role: true, reputationScore: true, threadCount: true, postCount: true,
        verifiedBadge: true, avatarFrameUrl: true, shopBadgeUrl: true, nameEffectCss: true,
        createdAt: true, lastSeenAt: true,
        badges: { include: { badge: true } },
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    // Chỉ công khai ngày sinh khi user bật hiển thị — và theo đúng định dạng đã chọn (giấu phần còn lại)
    const { showBirthday, birthday, birthdayFormat, ...rest } = user;
    return { ...rest, birthdayDisplay: showBirthday && birthday ? formatBirthday(birthday, birthdayFormat) : null };
  }

  // Thông tin "Giới thiệu" của chính user (đầy đủ, kể cả ngày sinh đang ẩn) — cho trang cài đặt
  async getMyAbout(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, bio: true, location: true, birthday: true, showBirthday: true, birthdayFormat: true, signature: true },
    });
    if (!u) throw new NotFoundException('Người dùng không tồn tại');
    return u;
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; bio?: string; avatar?: string; location?: string; birthday?: string | null; showBirthday?: boolean; birthdayFormat?: string; signature?: string },
  ) {
    const patch: any = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName?.trim() || null;
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (data.location !== undefined) patch.location = data.location?.trim() || null;
    if (data.showBirthday !== undefined) patch.showBirthday = !!data.showBirthday;
    if (data.birthdayFormat !== undefined && ['full', 'day_month', 'month_year', 'year'].includes(data.birthdayFormat)) patch.birthdayFormat = data.birthdayFormat;
    if (data.birthday !== undefined) patch.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.signature !== undefined) patch.signature = data.signature?.slice(0, 500) || null;
    return this.prisma.user.update({
      where: { id: userId },
      data: patch,
      select: { id: true, username: true, displayName: true, bio: true, avatar: true, location: true, birthday: true, showBirthday: true, birthdayFormat: true, signature: true },
    });
  }

  // Thư viện avatar công khai (các pack đang bật) để user chọn ảnh đại diện
  avatarLibrary() {
    return this.prisma.avatarPack.findMany({
      where: { isActive: true },
      include: { avatars: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
