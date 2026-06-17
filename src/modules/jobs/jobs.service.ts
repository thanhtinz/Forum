import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Prisma,
  JobCategory,
  JobBudgetType,
  JobStatus,
  ProposalStatus,
  EscrowStatus,
  JobDisputeStatus,
} from '@prisma/client';

const USER_BASIC = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} as const;

export interface CreateJobDto {
  title: string;
  category?: JobCategory;
  description: string;
  budgetType?: JobBudgetType;
  budgetMin?: number;
  budgetMax?: number;
  deadline?: string | Date;
  attachments?: any;
  skills?: string[];
  country?: string;
  language?: string;
}

export type UpdateJobDto = Partial<CreateJobDto>;

export interface ListJobsQuery {
  category?: JobCategory;
  budgetType?: JobBudgetType;
  country?: string;
  language?: string;
  q?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: JobStatus;
  sort?: 'recent' | 'budget';
  page?: number;
  limit?: number;
}

export interface SubmitProposalDto {
  coverLetter: string;
  bidAmount: number;
  days?: number;
  portfolioUrl?: string;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gem: GemService,
    private readonly notif: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────
  // JOBS CRUD
  // ──────────────────────────────────────────────
  async create(employerId: string, dto: CreateJobDto) {
    if (!dto.title?.trim()) throw new BadRequestException('Thiếu tiêu đề');
    if (!dto.description?.trim()) throw new BadRequestException('Thiếu mô tả');

    return this.prisma.job.create({
      data: {
        employerId,
        title: dto.title,
        category: dto.category ?? JobCategory.OTHER,
        description: dto.description,
        budgetType: dto.budgetType ?? JobBudgetType.FIXED,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        attachments: dto.attachments ?? Prisma.JsonNull,
        skills: dto.skills ?? [],
        country: dto.country,
        language: dto.language,
        status: JobStatus.OPEN,
      },
    });
  }

  // Tạo job gắn với một bài forum (đăng qua danh mục dạng module JOB).
  // Dùng lại UI đăng bài của forum: thread chứa tiêu đề + mô tả, job chỉ lưu phần "việc làm".
  async createForThread(employerId: string, threadId: string, dto: CreateJobDto) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { category: { select: { moduleType: true } } },
    });
    if (!thread) throw new NotFoundException('Không tìm thấy bài viết');
    if (thread.authorId !== employerId) throw new ForbiddenException('Không phải bài viết của bạn');
    if (thread.category?.moduleType !== 'JOB') {
      throw new BadRequestException('Danh mục này không phải module Việc làm');
    }
    const existing = await this.prisma.job.findUnique({ where: { threadId } });
    if (existing) throw new ConflictException('Bài viết này đã có thông tin việc làm');

    return this.prisma.job.create({
      data: {
        employerId,
        threadId,
        title: dto.title?.trim() || thread.title,
        category: dto.category ?? JobCategory.OTHER,
        description: dto.description?.trim() || thread.title,
        budgetType: dto.budgetType ?? JobBudgetType.FIXED,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        attachments: dto.attachments ?? Prisma.JsonNull,
        skills: dto.skills ?? [],
        country: dto.country,
        language: dto.language,
        status: JobStatus.OPEN,
      },
    });
  }

  // Lấy thông tin job gắn với 1 thread (null nếu thread không phải dạng JOB).
  async getByThread(threadId: string, viewerId?: string) {
    const job = await this.prisma.job.findUnique({ where: { threadId } });
    if (!job) return null;
    return this.get(job.id, viewerId);
  }

  async list(query: ListJobsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      status: query.status ?? JobStatus.OPEN,
    };
    if (query.category) where.category = query.category;
    if (query.budgetType) where.budgetType = query.budgetType;
    if (query.country) where.country = query.country;
    if (query.language) where.language = query.language;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const min = query.minBudget != null ? Number(query.minBudget) : undefined;
    const max = query.maxBudget != null ? Number(query.maxBudget) : undefined;
    if (min != null) where.budgetMax = { gte: min };
    if (max != null) where.budgetMin = { lte: max };

    const orderBy: Prisma.JobOrderByWithRelationInput =
      query.sort === 'budget' ? { budgetMax: 'desc' } : { createdAt: 'desc' };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          employer: { select: USER_BASIC },
          _count: { select: { proposals: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const data = jobs.map(({ _count, ...j }) => ({ ...j, proposalCount: _count.proposals }));
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async get(id: string, viewerId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        employer: { select: USER_BASIC },
        escrow: { select: { status: true, amount: true, fundedAt: true, releasedAt: true } },
        _count: { select: { proposals: true } },
      },
    });
    if (!job) throw new NotFoundException('Không tìm thấy job');

    const { _count, ...rest } = job;
    let myProposal: Prisma.JobProposalGetPayload<{}> | null = null;
    if (viewerId && viewerId !== job.employerId) {
      myProposal = await this.prisma.jobProposal.findUnique({
        where: { jobId_freelancerId: { jobId: id, freelancerId: viewerId } },
      });
    }
    return {
      ...rest,
      proposalCount: _count.proposals,
      isOwner: viewerId === job.employerId,
      myProposal,
    };
  }

  private async ownedJobOrThrow(id: string, employerId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (job.employerId !== employerId) throw new ForbiddenException('Không phải job của bạn');
    return job;
  }

  async update(id: string, employerId: string, dto: UpdateJobDto) {
    await this.ownedJobOrThrow(id, employerId);
    return this.prisma.job.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        description: dto.description,
        budgetType: dto.budgetType,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        deadline: dto.deadline === undefined ? undefined : dto.deadline ? new Date(dto.deadline) : null,
        attachments: dto.attachments === undefined ? undefined : (dto.attachments ?? Prisma.JsonNull),
        skills: dto.skills,
        country: dto.country,
        language: dto.language,
      },
    });
  }

  async cancel(id: string, employerId: string) {
    const job = await this.ownedJobOrThrow(id, employerId);
    if (job.status === JobStatus.OPEN) {
      return this.prisma.job.update({ where: { id }, data: { status: JobStatus.CANCELLED } });
    }
    if (job.status === JobStatus.IN_PROGRESS) {
      // Chỉ cho hủy khi chưa nộp việc (không SUBMITTED) → hoàn quỹ
      return this.prisma.$transaction(async (tx) => {
        const escrow = await tx.jobEscrow.findUnique({ where: { jobId: id } });
        if (escrow && escrow.status === EscrowStatus.FUNDED) {
          await this.gem.credit(escrow.employerId, escrow.amount, 'ESCROW_REFUND', id, 'Hoàn quỹ do hủy job');
          await tx.jobEscrow.update({
            where: { jobId: id },
            data: { status: EscrowStatus.REFUNDED },
          });
        }
        return tx.job.update({ where: { id }, data: { status: JobStatus.CANCELLED } });
      });
    }
    throw new BadRequestException('Không thể hủy job ở trạng thái này');
  }

  async myJobs(employerId: string, status?: JobStatus) {
    return this.prisma.job.findMany({
      where: { employerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        escrow: { select: { status: true, amount: true } },
        _count: { select: { proposals: true } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // PROPOSALS
  // ──────────────────────────────────────────────
  async submitProposal(freelancerId: string, jobId: string, dto: SubmitProposalDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (job.status !== JobStatus.OPEN) throw new BadRequestException('Job không còn nhận đề xuất');
    if (job.employerId === freelancerId) throw new BadRequestException('Không thể đề xuất cho job của chính mình');
    if (!dto.coverLetter?.trim()) throw new BadRequestException('Thiếu thư giới thiệu');
    if (!dto.bidAmount || dto.bidAmount <= 0) throw new BadRequestException('Số tiền đề xuất không hợp lệ');

    const existing = await this.prisma.jobProposal.findUnique({
      where: { jobId_freelancerId: { jobId, freelancerId } },
    });
    if (existing && existing.status !== ProposalStatus.INVITED) {
      throw new ConflictException('Bạn đã gửi đề xuất cho job này');
    }

    const proposal = existing
      ? await this.prisma.jobProposal.update({
          where: { id: existing.id },
          data: {
            coverLetter: dto.coverLetter,
            bidAmount: dto.bidAmount,
            days: dto.days ?? 7,
            portfolioUrl: dto.portfolioUrl,
            status: ProposalStatus.PENDING,
          },
        })
      : await this.prisma.jobProposal.create({
          data: {
            jobId,
            freelancerId,
            coverLetter: dto.coverLetter,
            bidAmount: dto.bidAmount,
            days: dto.days ?? 7,
            portfolioUrl: dto.portfolioUrl,
            status: ProposalStatus.PENDING,
          },
        });

    await this.notif.notify(job.employerId, {
      type: 'SYSTEM',
      title: 'Đề xuất mới cho job của bạn',
      body: job.title,
      link: `/jobs/${jobId}`,
      actorId: freelancerId,
      targetType: 'job',
      targetId: jobId,
    });

    return proposal;
  }

  async listProposals(jobId: string, employerId: string) {
    await this.ownedJobOrThrow(jobId, employerId);
    const proposals = await this.prisma.jobProposal.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: { freelancer: { select: USER_BASIC } },
    });
    const ids = proposals.map((p) => p.freelancerId);
    const profiles = await this.prisma.freelancerProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, ratingAvg: true, ratingCount: true, jobsDone: true, headline: true },
    });
    const byId = new Map(profiles.map((p) => [p.userId, p]));
    return proposals.map((p) => ({ ...p, freelancerProfile: byId.get(p.freelancerId) ?? null }));
  }

  async myProposals(freelancerId: string) {
    return this.prisma.jobProposal.findMany({
      where: { freelancerId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            employer: { select: USER_BASIC },
            escrow: { select: { status: true } },
          },
        },
      },
    });
  }

  async withdrawProposal(id: string, freelancerId: string) {
    const proposal = await this.prisma.jobProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');
    if (proposal.freelancerId !== freelancerId) throw new ForbiddenException('Không phải đề xuất của bạn');
    if (proposal.status === ProposalStatus.ACCEPTED)
      throw new BadRequestException('Không thể rút đề xuất đã được chấp nhận');
    return this.prisma.jobProposal.update({
      where: { id },
      data: { status: ProposalStatus.WITHDRAWN },
    });
  }

  async inviteFreelancer(jobId: string, employerId: string, freelancerId: string) {
    const job = await this.ownedJobOrThrow(jobId, employerId);
    if (freelancerId === employerId) throw new BadRequestException('Không thể mời chính mình');

    const proposal = await this.prisma.jobProposal.upsert({
      where: { jobId_freelancerId: { jobId, freelancerId } },
      create: {
        jobId,
        freelancerId,
        coverLetter: '',
        bidAmount: job.budgetMax ?? job.budgetMin ?? 0,
        days: 7,
        status: ProposalStatus.INVITED,
      },
      update: { status: ProposalStatus.INVITED },
    });

    await this.notif.notify(freelancerId, {
      type: 'SYSTEM',
      title: 'Bạn được mời ứng tuyển',
      body: job.title,
      link: `/jobs/${jobId}`,
      actorId: employerId,
      targetType: 'job',
      targetId: jobId,
    });

    return proposal;
  }

  async rejectProposal(id: string, employerId: string) {
    const proposal = await this.prisma.jobProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');
    await this.ownedJobOrThrow(proposal.jobId, employerId);
    const updated = await this.prisma.jobProposal.update({
      where: { id },
      data: { status: ProposalStatus.REJECTED },
    });
    await this.notif.notify(proposal.freelancerId, {
      type: 'SYSTEM',
      title: 'Đề xuất của bạn bị từ chối',
      link: `/jobs/${proposal.jobId}`,
      actorId: employerId,
      targetType: 'job',
      targetId: proposal.jobId,
    });
    return updated;
  }

  // ──────────────────────────────────────────────
  // HIRE + ESCROW
  // ──────────────────────────────────────────────
  async hire(proposalId: string, employerId: string) {
    const proposal = await this.prisma.jobProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');
    const job = await this.ownedJobOrThrow(proposal.jobId, employerId);
    if (job.status !== JobStatus.OPEN) throw new BadRequestException('Job không ở trạng thái mở');

    // Ký quỹ: trừ gem employer (ngoài transaction vì gem.debit tự dùng transaction riêng)
    try {
      await this.gem.debit(employerId, proposal.bidAmount, 'ESCROW_FUND', job.id, `Ký quỹ job ${job.title}`);
    } catch (e) {
      throw new BadRequestException('Không đủ gem để ký quỹ');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const escrow = await tx.jobEscrow.create({
        data: {
          jobId: job.id,
          employerId,
          freelancerId: proposal.freelancerId,
          amount: proposal.bidAmount,
          status: EscrowStatus.FUNDED,
        },
      });
      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: { status: JobStatus.IN_PROGRESS, hiredFreelancerId: proposal.freelancerId },
      });
      await tx.jobProposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.ACCEPTED },
      });
      await tx.jobProposal.updateMany({
        where: { jobId: job.id, id: { not: proposalId }, status: { in: [ProposalStatus.PENDING, ProposalStatus.INVITED] } },
        data: { status: ProposalStatus.REJECTED },
      });
      return { job: updatedJob, escrow };
    });

    await this.notif.notify(proposal.freelancerId, {
      type: 'SYSTEM',
      title: 'Bạn đã được thuê!',
      body: job.title,
      link: `/jobs/${job.id}`,
      actorId: employerId,
      targetType: 'job',
      targetId: job.id,
    });

    return result;
  }

  // ──────────────────────────────────────────────
  // WORKFLOW
  // ──────────────────────────────────────────────
  async submitWork(jobId: string, freelancerId: string, note: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (job.hiredFreelancerId !== freelancerId) throw new ForbiddenException('Bạn không phải freelancer của job này');
    if (job.status !== JobStatus.IN_PROGRESS) throw new BadRequestException('Job không ở trạng thái thực hiện');

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.SUBMITTED, submittedNote: note },
    });
    await this.notif.notify(job.employerId, {
      type: 'SYSTEM',
      title: 'Freelancer đã nộp việc',
      body: job.title,
      link: `/jobs/${jobId}`,
      actorId: freelancerId,
      targetType: 'job',
      targetId: jobId,
    });
    return updated;
  }

  async requestRevision(jobId: string, employerId: string, note?: string) {
    const job = await this.ownedJobOrThrow(jobId, employerId);
    if (job.status !== JobStatus.SUBMITTED) throw new BadRequestException('Job chưa được nộp');
    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.IN_PROGRESS, submittedNote: note ?? job.submittedNote },
    });
    if (job.hiredFreelancerId) {
      await this.notif.notify(job.hiredFreelancerId, {
        type: 'SYSTEM',
        title: 'Yêu cầu chỉnh sửa',
        body: note ?? job.title,
        link: `/jobs/${jobId}`,
        actorId: employerId,
        targetType: 'job',
        targetId: jobId,
      });
    }
    return updated;
  }

  async approve(jobId: string, employerId: string) {
    const job = await this.ownedJobOrThrow(jobId, employerId);
    if (job.status !== JobStatus.SUBMITTED && job.status !== JobStatus.IN_PROGRESS)
      throw new BadRequestException('Job không thể nghiệm thu ở trạng thái này');

    const escrow = await this.prisma.jobEscrow.findUnique({ where: { jobId } });
    if (!escrow || escrow.status !== EscrowStatus.FUNDED)
      throw new BadRequestException('Quỹ không khả dụng để giải ngân');

    // Giải ngân cho freelancer (ngoài transaction)
    await this.gem.credit(escrow.freelancerId, escrow.amount, 'ESCROW_RELEASE', jobId, `Giải ngân job ${job.title}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.jobEscrow.update({
        where: { jobId },
        data: { status: EscrowStatus.RELEASED, releasedAt: new Date() },
      });
      const j = await tx.job.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED } });
      await tx.freelancerProfile.upsert({
        where: { userId: escrow.freelancerId },
        create: {
          userId: escrow.freelancerId,
          jobsDone: 1,
          earned: escrow.amount,
        },
        update: {
          jobsDone: { increment: 1 },
          earned: { increment: escrow.amount },
        },
      });
      return j;
    });

    await this.notif.notify(escrow.freelancerId, {
      type: 'GEM_RECEIVED',
      title: 'Job đã được nghiệm thu, quỹ đã giải ngân',
      body: `+${escrow.amount} gem · ${job.title}`,
      link: `/jobs/${jobId}`,
      actorId: employerId,
      targetType: 'job',
      targetId: jobId,
    });

    return updated;
  }

  // ──────────────────────────────────────────────
  // DISPUTES
  // ──────────────────────────────────────────────
  async openDispute(jobId: string, userId: string, reason: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (userId !== job.employerId && userId !== job.hiredFreelancerId)
      throw new ForbiddenException('Bạn không liên quan đến job này');
    if (job.status !== JobStatus.IN_PROGRESS && job.status !== JobStatus.SUBMITTED)
      throw new BadRequestException('Chỉ tranh chấp job đang thực hiện hoặc đã nộp');
    if (!reason?.trim()) throw new BadRequestException('Thiếu lý do tranh chấp');

    return this.prisma.$transaction(async (tx) => {
      await tx.job.update({ where: { id: jobId }, data: { status: JobStatus.DISPUTED } });
      await tx.jobEscrow.updateMany({ where: { jobId }, data: { status: EscrowStatus.DISPUTED } });
      return tx.jobDispute.create({
        data: { jobId, openedById: userId, reason, status: JobDisputeStatus.OPEN },
      });
    });
  }

  async addEvidence(disputeId: string, userId: string, url: string) {
    const dispute = await this.prisma.jobDispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Không tìm thấy tranh chấp');
    const job = await this.prisma.job.findUnique({ where: { id: dispute.jobId } });
    if (!job || (userId !== job.employerId && userId !== job.hiredFreelancerId))
      throw new ForbiddenException('Bạn không liên quan đến tranh chấp này');
    if (!url?.trim()) throw new BadRequestException('Thiếu URL bằng chứng');
    return this.prisma.jobDispute.update({
      where: { id: disputeId },
      data: { evidence: { push: url } },
    });
  }

  async adminListDisputes(status?: JobDisputeStatus) {
    return this.prisma.jobDispute.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            employer: { select: USER_BASIC },
            escrow: { select: { status: true, amount: true, freelancerId: true } },
          },
        },
      },
    });
  }

  async adminResolve(
    disputeId: string,
    adminId: string,
    decision: 'refund' | 'release',
    resolution?: string,
  ) {
    const dispute = await this.prisma.jobDispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Không tìm thấy tranh chấp');
    if (dispute.status !== JobDisputeStatus.OPEN)
      throw new BadRequestException('Tranh chấp đã được xử lý');

    const escrow = await this.prisma.jobEscrow.findUnique({ where: { jobId: dispute.jobId } });
    if (!escrow) throw new NotFoundException('Không tìm thấy quỹ');

    if (decision === 'refund') {
      if (escrow.status === EscrowStatus.DISPUTED || escrow.status === EscrowStatus.FUNDED) {
        await this.gem.credit(escrow.employerId, escrow.amount, 'ESCROW_REFUND', dispute.jobId, 'Hoàn quỹ do tranh chấp');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.jobEscrow.update({ where: { jobId: dispute.jobId }, data: { status: EscrowStatus.REFUNDED } });
        await tx.job.update({ where: { id: dispute.jobId }, data: { status: JobStatus.CANCELLED } });
        await tx.jobDispute.update({
          where: { id: disputeId },
          data: { status: JobDisputeStatus.RESOLVED_REFUND, resolvedById: adminId, resolution, resolvedAt: new Date() },
        });
      });
      await this.notifyDisputeParties(escrow, 'Tranh chấp đã xử lý: hoàn quỹ cho người thuê', dispute.jobId);
    } else {
      if (escrow.status === EscrowStatus.DISPUTED || escrow.status === EscrowStatus.FUNDED) {
        await this.gem.credit(escrow.freelancerId, escrow.amount, 'ESCROW_RELEASE', dispute.jobId, 'Giải ngân do tranh chấp');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.jobEscrow.update({
          where: { jobId: dispute.jobId },
          data: { status: EscrowStatus.RELEASED, releasedAt: new Date() },
        });
        await tx.job.update({ where: { id: dispute.jobId }, data: { status: JobStatus.COMPLETED } });
        await tx.freelancerProfile.upsert({
          where: { userId: escrow.freelancerId },
          create: { userId: escrow.freelancerId, jobsDone: 1, earned: escrow.amount },
          update: { jobsDone: { increment: 1 }, earned: { increment: escrow.amount } },
        });
        await tx.jobDispute.update({
          where: { id: disputeId },
          data: { status: JobDisputeStatus.RESOLVED_RELEASE, resolvedById: adminId, resolution, resolvedAt: new Date() },
        });
      });
      await this.notifyDisputeParties(escrow, 'Tranh chấp đã xử lý: giải ngân cho freelancer', dispute.jobId);
    }

    return this.prisma.jobDispute.findUnique({ where: { id: disputeId } });
  }

  private async notifyDisputeParties(
    escrow: { employerId: string; freelancerId: string },
    title: string,
    jobId: string,
  ) {
    await Promise.all([
      this.notif.notify(escrow.employerId, { type: 'SYSTEM', title, link: `/jobs/${jobId}`, targetType: 'job', targetId: jobId }),
      this.notif.notify(escrow.freelancerId, { type: 'SYSTEM', title, link: `/jobs/${jobId}`, targetType: 'job', targetId: jobId }),
    ]);
  }

  // ──────────────────────────────────────────────
  // REVIEWS
  // ──────────────────────────────────────────────
  async leaveReview(jobId: string, fromId: string, rating: number, comment?: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (job.status !== JobStatus.COMPLETED) throw new BadRequestException('Chỉ đánh giá job đã hoàn thành');
    if (!rating || rating < 1 || rating > 5) throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5');

    const isEmployer = fromId === job.employerId;
    const isFreelancer = fromId === job.hiredFreelancerId;
    if (!isEmployer && !isFreelancer) throw new ForbiddenException('Bạn không liên quan đến job này');

    const toId = isEmployer ? job.hiredFreelancerId! : job.employerId;

    const review = await this.prisma.jobReview.upsert({
      where: { jobId_fromId: { jobId, fromId } },
      create: { jobId, fromId, toId, rating, comment, fromEmployer: isEmployer },
      update: { rating, comment, toId, fromEmployer: isEmployer },
    });

    // Chỉ tính lại rating khi đối tượng được đánh giá là freelancer (employer đánh giá freelancer)
    if (isEmployer) {
      const agg = await this.prisma.jobReview.aggregate({
        where: { toId, fromEmployer: true },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await this.prisma.freelancerProfile.upsert({
        where: { userId: toId },
        create: { userId: toId, ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count.rating },
        update: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count.rating },
      });
    }

    await this.notif.notify(toId, {
      type: 'SYSTEM',
      title: 'Bạn nhận được đánh giá mới',
      body: `${rating}★ · ${job.title}`,
      link: `/jobs/${jobId}`,
      actorId: fromId,
      targetType: 'job',
      targetId: jobId,
    });

    return review;
  }

  // ──────────────────────────────────────────────
  // BOOKMARKS
  // ──────────────────────────────────────────────
  async toggleBookmark(userId: string, jobId: string) {
    const existing = await this.prisma.jobBookmark.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    if (existing) {
      await this.prisma.jobBookmark.delete({ where: { userId_jobId: { userId, jobId } } });
      return { bookmarked: false };
    }
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    await this.prisma.jobBookmark.create({ data: { userId, jobId } });
    return { bookmarked: true };
  }

  async listBookmarks(userId: string) {
    const bookmarks = await this.prisma.jobBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            employer: { select: USER_BASIC },
            _count: { select: { proposals: true } },
          },
        },
      },
    });
    return bookmarks.map((b) => {
      const { _count, ...job } = b.job;
      return { ...b, job: { ...job, proposalCount: _count.proposals } };
    });
  }

  async getBookmarkState(userId: string, jobId: string) {
    const existing = await this.prisma.jobBookmark.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    return { bookmarked: !!existing };
  }
}
