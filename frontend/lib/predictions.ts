// Nhãn & kiểu dùng chung cho hệ thống Kèo dự đoán (Prediction Market)

export const PRED_CATEGORIES: Record<string, string> = {
  ANIME: 'Anime',
  MANGA: 'Manga',
  GAME: 'Game',
  ESPORTS: 'Esports',
  SPORTS: 'Thể thao',
  TECH: 'Công nghệ',
  CRYPTO: 'Crypto',
  COMMUNITY: 'Cộng đồng',
  OTHER: 'Khác',
};

export const MARKET_TYPES: Record<string, string> = {
  BINARY: 'Kèo 2 cửa',
  MULTI: 'Kèo nhiều cửa',
  HANDICAP: 'Kèo chấp',
  OVERUNDER: 'Tài xỉu',
  ONEXTWO: 'Kèo 1X2',
  ODDEVEN: 'Chẵn lẻ',
  EXACT: 'Tỷ số chính xác',
  CUSTOM: 'Tùy chỉnh',
};

export const ODDS_MODES: Record<string, string> = {
  POOL: 'Chia quỹ (pari-mutuel)',
  FIXED: 'Odds cố định (nhà cái)',
};

export const VISIBILITIES: Record<string, string> = {
  PUBLIC: 'Công khai',
  PRIVATE: 'Riêng tư (mật khẩu)',
  FRIENDS: 'Chỉ bạn bè',
  GUILD: 'Chỉ Guild/Nhóm',
};

export const PRED_STATUS: Record<string, string> = {
  OPEN: 'Đang mở',
  LOCKED: 'Đã khoá',
  RESULT_PENDING: 'Chờ kết quả',
  SETTLED: 'Đã chốt',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Tranh chấp',
};

export const RANK_LABELS: Record<string, string> = {
  ROOKIE: 'Rookie',
  CHALLENGER: 'Challenger',
  MASTER: 'Master',
  GRANDMASTER: 'Grandmaster',
  LEGEND: 'Legend',
};

export const RANK_COLORS: Record<string, string> = {
  ROOKIE: 'bg-ink-200 text-ink-700',
  CHALLENGER: 'bg-emerald-100 text-emerald-700',
  MASTER: 'bg-sky-100 text-sky-700',
  GRANDMASTER: 'bg-violet-100 text-violet-700',
  LEGEND: 'bg-amber-100 text-amber-700',
};

// Gợi ý lựa chọn mặc định theo loại kèo
export function defaultOptions(type: string): string[] {
  switch (type) {
    case 'BINARY': return ['Có', 'Không'];
    case 'ONEXTWO': return ['Chủ nhà thắng', 'Hoà', 'Khách thắng'];
    case 'ODDEVEN': return ['Chẵn', 'Lẻ'];
    case 'OVERUNDER': return ['Tài', 'Xỉu'];
    case 'HANDICAP': return ['Cửa trên', 'Cửa dưới'];
    case 'EXACT': return ['1-0', '2-0', '2-1', 'Khác'];
    case 'MULTI': return ['', '', '', ''];
    default: return ['', ''];
  }
}

export const HANDICAP_LINES = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
export const OVERUNDER_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];

export interface PredOption { label: string; total: number; count: number; odds: number }

export interface Prediction {
  id: string;
  title: string;
  description?: string | null;
  options: string[];
  category: string;
  marketType: string;
  oddsMode: string;
  fixedOdds?: number[] | null;
  line?: number | null;
  isAdminMarket: boolean;
  visibility: string;
  hasPassword: boolean;
  image?: string | null;
  banner?: string | null;
  tags: string[];
  status: string;
  correctIndex?: number | null;
  closesAt?: string | null;
  opensAt?: string | null;
  resultAt?: string | null;
  minBet: number;
  maxBet?: number | null;
  commissionBps: number;
  creatorStake: number;
  creatorEscrow: number;
  createdBy: string;
  createdAt: string;
  settledAt?: string | null;
  resultNote?: string | null;
  optionTotals: number[];
  optionCounts: number[];
  odds: number[];
  pool: number;
  betCount: number;
  creator?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
  isOwner?: boolean;
  myBets?: { id: string; optionIndex: number; amount: number; odds: number; payout: number; status: string }[];
}

export function catLabel(c?: string) { return (c && PRED_CATEGORIES[c]) || c || ''; }
export function typeLabel(t?: string) { return (t && MARKET_TYPES[t]) || t || ''; }
export function statusLabel(s?: string) { return (s && PRED_STATUS[s]) || s || ''; }

export function parseTags(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
