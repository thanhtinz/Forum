import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PresignUploadDto {
  // tên file gốc — dùng để lấy phần mở rộng
  @IsString()
  filename: string;

  // image/png, image/jpeg, video/mp4, ...
  @IsString()
  contentType: string;

  // kích thước file (byte) — để validate trước khi cho upload
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 1024)
  size?: number;

  // thư mục logic: avatars | banners | products | chat | attachments
  @IsOptional()
  @IsString()
  folder?: string;
}
