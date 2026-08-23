/** Số lựa chọn cho phép trong một cuộc bình chọn. */
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const POLL_QUESTION_MAX = 200;
export const POLL_OPTION_MAX = 100;

/** Các mốc thời gian đóng bình chọn, tính bằng giờ; 0 = không giới hạn. */
export const POLL_DURATIONS: { hours: number; label: string }[] = [
  { hours: 0, label: 'Không giới hạn' },
  { hours: 24, label: '1 ngày' },
  { hours: 72, label: '3 ngày' },
  { hours: 168, label: '7 ngày' },
  { hours: 720, label: '30 ngày' },
];

export interface PollOptionView {
  id: string;
  text: string;
  votes: number;
  /** Phần trăm trên tổng số phiếu, làm tròn tới 0,1. */
  percent: number;
  mine: boolean;
}

export interface PollView {
  id: string;
  question: string;
  multiple: boolean;
  closesAt: Date | null;
  /** Đã đóng: hết hạn hoặc bị đóng sớm. */
  closed: boolean;
  options: PollOptionView[];
  totalVotes: number;
  voterCount: number;
  voted: boolean;
}

/** Bình chọn đã kết thúc chưa (đóng sớm hoặc quá hạn). */
export function isPollClosed(poll: { closed: boolean; closesAt: Date | null }): boolean {
  return poll.closed || (!!poll.closesAt && poll.closesAt.getTime() <= Date.now());
}

/**
 * Dựng dữ liệu hiển thị từ bản ghi thô.
 *
 * Phần trăm tính trên tổng số phiếu chứ không phải số người, vì bình chọn nhiều
 * lựa chọn thì một người bỏ được nhiều phiếu — cộng lại vẫn đúng 100%.
 */
export function toPollView(
  poll: {
    id: string; question: string; multiple: boolean; closesAt: Date | null; closed: boolean;
    options: { id: string; text: string; order: number }[];
    votes: { optionId: string; userId: string }[];
  },
  me: string | null,
): PollView {
  const total = poll.votes.length;
  const voters = new Set(poll.votes.map((v) => v.userId));
  const mine = new Set(poll.votes.filter((v) => v.userId === me).map((v) => v.optionId));

  const options = [...poll.options]
    .sort((a, b) => a.order - b.order)
    .map((o) => {
      const votes = poll.votes.filter((v) => v.optionId === o.id).length;
      return {
        id: o.id,
        text: o.text,
        votes,
        percent: total === 0 ? 0 : Math.round((votes / total) * 1000) / 10,
        mine: mine.has(o.id),
      };
    });

  return {
    id: poll.id,
    question: poll.question,
    multiple: poll.multiple,
    closesAt: poll.closesAt,
    closed: isPollClosed(poll),
    options,
    totalVotes: total,
    voterCount: voters.size,
    voted: mine.size > 0,
  };
}

/**
 * Đọc câu hỏi và các lựa chọn từ form đăng chủ đề.
 *
 * Trả về null nếu người dùng không định tạo bình chọn (bỏ trống câu hỏi), và
 * trả về lỗi tiếng Việt nếu điền dở dang.
 */
export function readPollForm(formData: FormData):
  { poll: null; error?: undefined }
  | { poll: { question: string; options: string[]; multiple: boolean; hours: number }; error?: undefined }
  | { poll?: undefined; error: string } {
  const question = String(formData.get('pollQuestion') ?? '').trim();
  const options = formData.getAll('pollOption')
    .map((x) => String(x).trim().slice(0, POLL_OPTION_MAX))
    .filter(Boolean);

  if (!question && options.length === 0) return { poll: null };
  if (!question) return { error: 'Hãy nhập câu hỏi cho phần bình chọn.' };
  if (question.length > POLL_QUESTION_MAX) return { error: `Câu hỏi bình chọn tối đa ${POLL_QUESTION_MAX} ký tự.` };
  if (options.length < POLL_MIN_OPTIONS) return { error: `Bình chọn cần ít nhất ${POLL_MIN_OPTIONS} lựa chọn.` };
  if (options.length > POLL_MAX_OPTIONS) return { error: `Bình chọn tối đa ${POLL_MAX_OPTIONS} lựa chọn.` };

  const dedup = new Set(options.map((o) => o.toLowerCase()));
  if (dedup.size !== options.length) return { error: 'Các lựa chọn không được trùng nhau.' };

  const hours = parseInt(String(formData.get('pollHours') ?? '0'), 10) || 0;
  const allowed = POLL_DURATIONS.some((d) => d.hours === hours);

  return {
    poll: {
      question,
      options,
      multiple: formData.get('pollMultiple') === 'on',
      hours: allowed ? hours : 0,
    },
  };
}
