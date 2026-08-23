/** Điểm treo thưởng tối thiểu và tối đa cho một chủ đề. */
export const BOUNTY_MIN = 5;
export const BOUNTY_MAX = 10000;

/**
 * Đọc số điểm treo thưởng từ form đăng chủ đề.
 *
 * Bỏ trống nghĩa là không treo thưởng. Trả về lỗi tiếng Việt nếu điền sai để
 * nơi gọi trả thẳng cho người dùng.
 */
export function readBounty(raw: FormDataEntryValue | null):
  { bounty: number; error?: undefined } | { bounty?: undefined; error: string } {
  const text = String(raw ?? '').trim();
  if (!text) return { bounty: 0 };

  const n = Number(text);
  if (!Number.isInteger(n) || n < 0) return { error: 'Điểm treo thưởng phải là số nguyên không âm.' };
  if (n === 0) return { bounty: 0 };
  if (n < BOUNTY_MIN) return { error: `Treo thưởng tối thiểu ${BOUNTY_MIN} điểm.` };
  if (n > BOUNTY_MAX) return { error: `Treo thưởng tối đa ${BOUNTY_MAX} điểm.` };
  return { bounty: n };
}
