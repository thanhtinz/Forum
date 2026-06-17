// Nhãn & kiểu dùng chung cho phần Việc làm (freelance marketplace)

export const CATEGORY_LABELS: Record<string, string> = {
  DESIGN: 'Thiết kế',
  PROGRAMMING: 'Lập trình',
  TRANSLATION: 'Dịch thuật',
  MARKETING: 'Marketing',
  CONTENT: 'Viết content',
  VIDEO: 'Edit video',
  AI_PROMPT: 'AI Prompt',
  OTHER: 'Khác',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS);

export const BUDGET_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Cố định',
  HOURLY: 'Theo giờ',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Tranh chấp',
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  HIRED: 'Đã chọn',
  REJECTED: 'Bị từ chối',
  WITHDRAWN: 'Đã rút',
};

export function catLabel(c?: string) {
  return (c && CATEGORY_LABELS[c]) || c || '';
}
export function budgetLabel(t?: string) {
  return (t && BUDGET_TYPE_LABELS[t]) || t || '';
}
export function statusLabel(s?: string) {
  return (s && JOB_STATUS_LABELS[s]) || s || '';
}

export function formatBudget(job: { budgetType?: string; budgetMin?: number | null; budgetMax?: number | null }): string {
  const { budgetMin, budgetMax } = job;
  const suffix = job.budgetType === 'HOURLY' ? ' gem/giờ' : ' gem';
  if (budgetMin != null && budgetMax != null && budgetMin !== budgetMax) return `${budgetMin.toLocaleString()} – ${budgetMax.toLocaleString()}${suffix}`;
  const v = budgetMin ?? budgetMax;
  if (v != null) return `${v.toLocaleString()}${suffix}`;
  return 'Thoả thuận';
}

export interface JobEmployer { id: string; username: string; displayName?: string | null; avatar?: string | null }

export interface Job {
  id: string;
  title: string;
  category: string;
  description: string;
  budgetType: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  deadline?: string | null;
  skills?: string[];
  country?: string | null;
  language?: string | null;
  status: string;
  createdAt: string;
  employer: JobEmployer;
  proposalCount: number;
  attachments?: { url: string; name: string }[];
  // chi tiết
  escrow?: { status: string; amount: number; fundedAt?: string | null; releasedAt?: string | null } | null;
  isOwner?: boolean;
  hiredFreelancerId?: string | null;
  myProposal?: Proposal | null;
}

export interface Proposal {
  id: string;
  coverLetter: string;
  bidAmount: number;
  days: number;
  portfolioUrl?: string | null;
  status: string;
  createdAt: string;
  freelancer?: { id: string; username: string; displayName?: string | null; avatar?: string | null; ratingAvg?: number; ratingCount?: number };
}

export interface Meta { total: number; page: number; limit: number; totalPages: number }

export interface FreelancerCard {
  userId: string;
  headline?: string | null;
  skills: string[];
  hourlyRate?: number | null;
  country?: string | null;
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
  user: { id: string; username: string; displayName?: string | null; avatar?: string | null };
}

export interface FreelancerProfile extends FreelancerCard {
  bio?: string | null;
  languages: string[];
  portfolio: { title: string; url: string; image?: string }[];
  experience?: string | null;
  certifications: string[];
  available: boolean;
  earned?: number;
}

export function parseList(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
