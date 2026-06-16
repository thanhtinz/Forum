import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportType } from '@prisma/client';

export class CreateReportDto {
  // loại đối tượng bị báo cáo: thread | post | product | user | message...
  @IsString()
  @MaxLength(20)
  targetType: string;

  @IsString()
  targetId: string;

  // nếu báo cáo nhắm vào 1 user cụ thể
  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;
}

export class CreateScamReportDto {
  @IsString()
  reportedId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  evidence: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  evidenceUrls?: string[];
}
