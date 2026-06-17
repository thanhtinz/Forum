import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService } from '../ai-companion/ai-provider.service';
import { CATEGORY_LABELS } from './job-labels';

const MAX_LEN = 6000;

const USER_BASIC = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} as const;

@Injectable()
export class JobsAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProviderService,
  ) {}

  private async pickModel(): Promise<{ provider: AiProvider; modelId: string }> {
    const persona = await this.prisma.aiPersona.findFirst({ where: { isDefault: true } });
    if (persona) return { provider: persona.provider, modelId: persona.modelId };
    return { provider: 'GEMINI' as AiProvider, modelId: 'gemini-2.0-flash' };
  }

  private async run(systemPrompt: string, userContent: string): Promise<string> {
    const { provider, modelId } = await this.pickModel();
    return this.ai.complete(provider, modelId, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]);
  }

  private clean(text: string): string {
    const t = (text ?? '').trim();
    if (!t) throw new BadRequestException('Nội dung trống');
    return t.slice(0, MAX_LEN);
  }

  // ── AI: sinh mô tả công việc từ ý tưởng ngắn ──
  async generateDescription(brief: string, category?: string): Promise<{ result: string }> {
    const content = this.clean(brief);
    const catStr = category && CATEGORY_LABELS[category] ? ` thuộc lĩnh vực ${CATEGORY_LABELS[category]}` : '';
    const result = await this.run(
      `Bạn là chuyên gia tuyển dụng freelancer. Viết một bản mô tả công việc${catStr} chuyên nghiệp bằng tiếng Việt ` +
        'dựa trên ý tưởng của nhà tuyển dụng. Bao gồm: bối cảnh, công việc cần làm, yêu cầu kỹ năng, sản phẩm bàn giao. ' +
        'Trình bày rõ ràng, có thể dùng tiêu đề và gạch đầu dòng. Chỉ trả về nội dung mô tả.',
      content,
    );
    return { result: result.trim() };
  }

  // ── AI: phân tích CV / hồ sơ năng lực ──
  async analyzeCv(text: string): Promise<{ result: string }> {
    const content = this.clean(text);
    const result = await this.run(
      'Bạn là chuyên gia nhân sự. Phân tích CV/hồ sơ sau bằng tiếng Việt: tóm tắt điểm mạnh, kỹ năng nổi bật, ' +
        'kinh nghiệm phù hợp và gợi ý cải thiện. Trình bày ngắn gọn theo mục.',
      content,
    );
    return { result: result.trim() };
  }

  // ── Gợi ý freelancer cho job: chấm điểm theo độ trùng kỹ năng + rating ──
  async suggestFreelancers(jobId: string, limit = 8) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');

    const profiles = await this.prisma.freelancerProfile.findMany({
      where: { available: true, userId: { not: job.employerId } },
      include: { user: { select: USER_BASIC } },
      take: 200,
    });

    const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase());
    const scored = profiles
      .map((p) => {
        const skills = (p.skills ?? []).map((s) => s.toLowerCase());
        const matched = jobSkills.filter((s) => skills.some((x) => x.includes(s) || s.includes(x)));
        const skillScore = jobSkills.length ? matched.length / jobSkills.length : 0;
        const ratingScore = Math.min(1, (p.ratingAvg || 0) / 5);
        const expScore = Math.min(1, (p.jobsDone || 0) / 20);
        // điểm tổng: kỹ năng 60%, đánh giá 25%, kinh nghiệm 15%
        const score = Math.round((skillScore * 0.6 + ratingScore * 0.25 + expScore * 0.15) * 100);
        const matchedSkills = (job.skills ?? []).filter((_, i) => matched.includes(jobSkills[i]));
        return { ...p, matchScore: score, matchedSkills };
      })
      .filter((p) => p.matchScore > 0 || jobSkills.length === 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return scored;
  }

  // ── Chấm điểm ứng viên (đề xuất) cho chủ job bằng AI ──
  async scoreCandidates(jobId: string, ownerId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (job.employerId !== ownerId) throw new ForbiddenException('Không phải job của bạn');

    const proposals = await this.prisma.jobProposal.findMany({
      where: { jobId },
      include: { freelancer: { select: { ...USER_BASIC, freelancerProfile: { select: { skills: true, ratingAvg: true, jobsDone: true, headline: true } } } } },
    });
    if (proposals.length === 0) return [];

    const jobInfo = `Tiêu đề: ${job.title}\nLĩnh vực: ${CATEGORY_LABELS[job.category] || job.category}\nNgân sách: ${job.budgetMin ?? '?'}-${job.budgetMax ?? '?'} gem\nKỹ năng cần: ${(job.skills ?? []).join(', ') || 'không nêu'}\nMô tả: ${job.description.slice(0, 1500)}`;

    const candidatesText = proposals
      .map((p, i) => {
        const prof = (p.freelancer as any)?.freelancerProfile;
        return `#${i + 1} (id=${p.id}) Giá: ${p.bidAmount} gem, ${p.days} ngày. ` +
          `Kỹ năng: ${(prof?.skills ?? []).join(', ') || '—'}. Rating: ${prof?.ratingAvg ?? 0}, đã làm ${prof?.jobsDone ?? 0} job.\n` +
          `Thư giới thiệu: ${(p.coverLetter || '').slice(0, 600)}`;
      })
      .join('\n\n');

    const raw = await this.run(
      'Bạn là chuyên gia tuyển dụng. Cho điểm mỗi ứng viên (0-100) về độ phù hợp với công việc, ' +
        'cân nhắc kỹ năng, giá, kinh nghiệm, chất lượng thư giới thiệu. ' +
        'Chỉ trả về JSON mảng: [{"id":"<id đề xuất>","score":<0-100>,"reason":"<lý do ngắn tiếng Việt>"}]. Không thêm chữ nào khác.',
      `CÔNG VIỆC:\n${jobInfo}\n\nỨNG VIÊN:\n${candidatesText}`,
    );

    const parsed = this.parseScores(raw);
    // ghép điểm AI vào từng proposal; nếu thiếu thì để 0
    return proposals.map((p) => {
      const match = parsed.find((x) => x.id === p.id);
      return {
        proposalId: p.id,
        freelancer: p.freelancer,
        bidAmount: p.bidAmount,
        days: p.days,
        score: match?.score ?? 0,
        reason: match?.reason ?? '',
      };
    }).sort((a, b) => b.score - a.score);
  }

  private parseScores(raw: string): { id: string; score: number; reason: string }[] {
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return [];
    try {
      const arr = JSON.parse(raw.slice(start, end + 1));
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x: any) => ({ id: String(x.id), score: Math.max(0, Math.min(100, Number(x.score) || 0)), reason: String(x.reason || '') }))
        .filter((x) => x.id);
    } catch {
      return [];
    }
  }
}
