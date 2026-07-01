import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { HiddenGateType } from '@prisma/client';

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

  @IsEnum(HiddenGateType)
  gateType: HiddenGateType;

  // LIKE_REQUIRED | LIKE_AND_COMMENT | LIKE_OR_COMMENT | LIKE_OR_GEM
  @ValidateIf((o) =>
    [
      HiddenGateType.LIKE_REQUIRED,
      HiddenGateType.LIKE_AND_COMMENT,
      HiddenGateType.LIKE_OR_COMMENT,
      HiddenGateType.LIKE_OR_GEM,
    ].includes(o.gateType),
  )
  @IsInt()
  @Min(1)
  likeRequired?: number;

  // COMMENT_REQUIRED | LIKE_AND_COMMENT | LIKE_OR_COMMENT | COMMENT_OR_GEM
  @ValidateIf((o) =>
    [
      HiddenGateType.COMMENT_REQUIRED,
      HiddenGateType.LIKE_AND_COMMENT,
      HiddenGateType.LIKE_OR_COMMENT,
      HiddenGateType.COMMENT_OR_GEM,
    ].includes(o.gateType),
  )
  @IsInt()
  @Min(1)
  commentRequired?: number;

  // GEM_PURCHASE | LIKE_OR_GEM | COMMENT_OR_GEM
  @ValidateIf((o) =>
    [
      HiddenGateType.GEM_PURCHASE,
      HiddenGateType.LIKE_OR_GEM,
      HiddenGateType.COMMENT_OR_GEM,
    ].includes(o.gateType),
  )
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

  @IsEnum(HiddenGateType)
  gateType: HiddenGateType;

  @ValidateIf((o) =>
    [
      HiddenGateType.LIKE_REQUIRED,
      HiddenGateType.LIKE_AND_COMMENT,
      HiddenGateType.LIKE_OR_COMMENT,
      HiddenGateType.LIKE_OR_GEM,
    ].includes(o.gateType),
  )
  @IsInt()
  @Min(1)
  likeRequired?: number;

  @ValidateIf((o) =>
    [
      HiddenGateType.COMMENT_REQUIRED,
      HiddenGateType.LIKE_AND_COMMENT,
      HiddenGateType.LIKE_OR_COMMENT,
      HiddenGateType.COMMENT_OR_GEM,
    ].includes(o.gateType),
  )
  @IsInt()
  @Min(1)
  commentRequired?: number;

  @ValidateIf((o) =>
    [
      HiddenGateType.GEM_PURCHASE,
      HiddenGateType.LIKE_OR_GEM,
      HiddenGateType.COMMENT_OR_GEM,
    ].includes(o.gateType),
  )
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
  unlockedVia?: string;    // 'like' | 'comment' | 'gem' | 'auto'
  content?: string;        // chỉ có khi isUnlocked = true
  // progress cho user chưa unlock
  currentLikes?: number;
  currentComments?: number;
}
