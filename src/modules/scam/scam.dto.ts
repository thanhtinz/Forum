import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength, Min,
  ValidateNested, ArrayMaxSize, IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ScamTargetType, ScamReason, ScamCaseStatus, ScamRiskLevel,
  ScamEvidenceKind, ScamVoteKind, ScamBlacklistKind,
} from '@prisma/client';

export class EvidenceDto {
  @IsEnum(ScamEvidenceKind) kind: ScamEvidenceKind;
  @IsOptional() @IsString() @MaxLength(500) url?: string;
  @IsOptional() @IsString() @MaxLength(500) label?: string;
}

export class CreateScamCaseDto {
  @IsEnum(ScamTargetType) targetType: ScamTargetType;
  @IsEnum(ScamReason) reason: ScamReason;

  @IsOptional() @IsString() reportedUserId?: string;
  @IsOptional() @IsString() @MaxLength(150) targetName?: string;
  @IsOptional() @IsString() @MaxLength(100) targetUid?: string;
  @IsOptional() @IsString() @MaxLength(150) targetEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) targetPhone?: string;
  @IsOptional() @IsString() @MaxLength(30) targetBankAccount?: string;
  @IsOptional() @IsString() @MaxLength(100) targetBank?: string;
  @IsOptional() @IsString() @MaxLength(120) targetWallet?: string;
  @IsOptional() @IsString() @MaxLength(150) targetDomain?: string;
  @IsOptional() @IsString() @MaxLength(100) targetDiscord?: string;
  @IsOptional() @IsString() @MaxLength(100) targetTelegram?: string;
  @IsOptional() @IsString() @MaxLength(150) targetFacebook?: string;
  @IsOptional() @IsString() @MaxLength(40) targetZalo?: string;

  @IsString() @MinLength(8) @MaxLength(200) title: string;
  @IsString() @MinLength(20) @MaxLength(8000) description: string;
  @IsOptional() @IsInt() @Min(0) damageValue?: number;
  @IsOptional() @IsISO8601() incidentDate?: string;
  @IsOptional() @IsString() @MaxLength(120) orderRef?: string;

  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EvidenceDto)
  evidence: EvidenceDto[];
}

export class UpdateScamCaseDto {
  @IsOptional() @IsString() @MinLength(8) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(8000) description?: string;
  @IsOptional() @IsInt() @Min(0) damageValue?: number;
  @IsOptional() @IsString() @MaxLength(120) orderRef?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];
}

export class CommentDto {
  @IsString() @MinLength(2) @MaxLength(3000) body: string;
}

export class VoteDto {
  @IsEnum(ScamVoteKind) kind: ScamVoteKind;
}

export class AppealDto {
  @IsString() @MinLength(10) @MaxLength(3000) reason: string;
}

export class AdminStatusDto {
  @IsEnum(ScamCaseStatus) status: ScamCaseStatus;
  @IsOptional() @IsEnum(ScamRiskLevel) riskLevel?: ScamRiskLevel;
  @IsOptional() @IsString() @MaxLength(3000) modNote?: string;
}

export class BlacklistDto {
  @IsEnum(ScamBlacklistKind) kind: ScamBlacklistKind;
  @IsString() @MaxLength(200) value: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class BroadcastDto {
  @IsString() @MinLength(4) @MaxLength(255) title: string;
  @IsString() @MinLength(4) @MaxLength(500) body: string;
}

export class AppealActionDto {
  @IsEnum(['accept', 'reject'] as any) action: 'accept' | 'reject';
  @IsOptional() @IsString() @MaxLength(2000) modNote?: string;
}
