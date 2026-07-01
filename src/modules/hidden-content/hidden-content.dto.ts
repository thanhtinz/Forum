import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { HiddenGateType } from '@prisma/client';

// 4 kiểu điều kiện mở khoá: bắt buộc Like & Bình luận (mặc định, không cần nhập số),
// tổng lượt thích, tổng bình luận (2 kiểu này cần nhập ngưỡng số liệu), hoặc mua bằng Gem.
const CREATABLE_GATE_TYPES = [
  HiddenGateType.LIKE_AND_COMMENT,
  HiddenGateType.LIKE_REQUIRED,
  HiddenGateType.COMMENT_REQUIRED,
  HiddenGateType.GEM_PURCHASE,
];

export class CreateHiddenSectionDto {
  @IsString()
  postId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  contentRaw: string; // BBCode/Markdown từ editor

  @IsIn(CREATABLE_GATE_TYPES)
  gateType: HiddenGateType;

  @ValidateIf((o) => o.gateType === HiddenGateType.LIKE_REQUIRED)
  @IsInt()
  @Min(1)
  likeRequired?: number;

  @ValidateIf((o) => o.gateType === HiddenGateType.COMMENT_REQUIRED)
  @IsInt()
  @Min(1)
  commentRequired?: number;

  @ValidateIf((o) => o.gateType === HiddenGateType.GEM_PURCHASE)
  @IsInt()
  @Min(1)
  gemPrice?: number;
}

// Cập nhật 1 hidden section đã có (gọi khi sửa bài) — không đổi postId/sortOrder
export class UpdateHiddenSectionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  contentRaw: string; // BBCode/Markdown từ editor

  @IsIn(CREATABLE_GATE_TYPES)
  gateType: HiddenGateType;

  @ValidateIf((o) => o.gateType === HiddenGateType.LIKE_REQUIRED)
  @IsInt()
  @Min(1)
  likeRequired?: number;

  @ValidateIf((o) => o.gateType === HiddenGateType.COMMENT_REQUIRED)
  @IsInt()
  @Min(1)
  commentRequired?: number;

  @ValidateIf((o) => o.gateType === HiddenGateType.GEM_PURCHASE)
  @IsInt()
  @Min(1)
  gemPrice?: number;
}

export class UnlockHiddenSectionDto {
  @IsString()
  hiddenSectionId: string;

  // chỉ cần khi gateType có gem option, để user chọn unlock bằng gem thay vì đợi like/comment
  @IsOptional()
  @IsEnum(['gem', 'condition'])
  preferredMethod?: 'gem' | 'condition';
}

export class HiddenSectionResponseDto {
  id: string;
  postId: string;
  sortOrder: number;
  label: string | null;
  gateType: HiddenGateType;
  likeRequired: number | null;
  commentRequired: number | null;
  gemPrice: number | null;
  unlockCount: number;
  isUnlocked: boolean;     // true nếu user hiện tại đã unlock
  unlockedVia?: string;    // 'like_and_comment' | 'gem'
  content?: string;        // chỉ có khi isUnlocked = true
  // progress cho user chưa unlock
  currentLikes?: number;
  currentComments?: number;
}
