/*
 * BỐN NHÃN CỦA MỘT CHỦ ĐỀ.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được.
 *
 * Thứ tự ở đây là thứ tự bày ra: nặng việc trước, tán gẫu sau. Người mở chủ đề
 * đọc từ trên xuống và dừng ở nhãn đầu tiên thấy đúng, nên nhãn nào cần được
 * chọn đúng nhất thì đứng trước.
 */

export const NHAN = [
  {
    ma: 'HOI_DAP',
    ten: 'Hỏi đáp',
    ta: 'Kẹt chỗ nào, máy có chạy được không, tìm bản nào',
    sac: 'bg-nhan/12 text-nhan',
  },
  {
    ma: 'BAO_LOI',
    ten: 'Báo lỗi',
    ta: 'Game vỡ, tệp hỏng, cài không nổi',
    sac: 'bg-xau/10 text-xau',
  },
  {
    ma: 'MEO_HAY',
    ten: 'Mẹo hay',
    ta: 'Cách qua màn, mẹo ăn điểm, thứ bạn mò ra',
    sac: 'bg-canh/12 text-canh',
  },
  {
    ma: 'TAN_GAU',
    ten: 'Tán gẫu',
    ta: 'Kỷ niệm, hỏi vu vơ, mọi thứ còn lại',
    sac: 'bg-nen3 text-mo',
  },
] as const;

export type MaNhan = (typeof NHAN)[number]['ma'];

export const MA_NHAN: readonly string[] = NHAN.map((n) => n.ma);

/** Mặc định là nhãn NHẸ NHẤT — xem chú thích trên cột `ChuDe.nhan`. */
export const NHAN_MAC_DINH = 'TAN_GAU';

export function laNhan(ma: string | null | undefined): boolean {
  return MA_NHAN.includes(String(ma ?? ''));
}

export function tenNhan(ma: string): string {
  return NHAN.find((n) => n.ma === ma)?.ten ?? ma;
}
