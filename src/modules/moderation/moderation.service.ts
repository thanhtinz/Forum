import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto, CreateScamReportDto } from './moderation.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Báo cáo chung (spam, nội dung không phù hợp, vi phạm bản quyền...)
  // Hàng đợi xử lý nằm ở Admin module (getReports / resolveReport)
  // ──────────────────────────────────────────────
  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.reportedUserId && dto.reportedUserId === reporterId) {
      throw new BadRequestException('Không thể tự báo cáo chính mình');
    }

    // chống spam: 1 user không gửi trùng report đang chờ xử lý cho cùng target
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã báo cáo nội dung này và đang chờ xử lý');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        type: dto.type,
        reason: dto.reason,
      },
    });
  }

  // ──────────────────────────────────────────────
  // Tố cáo lừa đảo (giao dịch marketplace) — kèm bằng chứng
  // ──────────────────────────────────────────────
  async createScamReport(reporterId: string, dto: CreateScamReportDto) {
    if (dto.reportedId === reporterId) {
      throw new BadRequestException('Không thể tự tố cáo chính mình');
    }

    const reported = await this.prisma.user.findUnique({
      where: { id: dto.reportedId },
      select: { id: true },
    });
    if (!reported) throw new NotFoundException('Người bị tố cáo không tồn tại');

    return this.prisma.scamReport.create({
      data: {
        reporterId,
        reportedId: dto.reportedId,
        evidence: dto.evidence,
        evidenceUrls: dto.evidenceUrls ?? [],
      },
    });
  }

  // ──────────────────────────────────────────────
  // Lịch sử báo cáo của chính user
  // ──────────────────────────────────────────────
  async myReports(reporterId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { reporterId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where: { reporterId } }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
