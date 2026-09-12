import { gop } from '@/lib/tien-ich';

/*
 * Nhãn trạng thái của một game, dùng chung ở bảng tác giả và hàng chờ duyệt.
 *
 * Năm trạng thái, năm màu khác hẳn nhau — không dùng sắc độ của cùng một màu:
 * "chờ duyệt" và "bị trả lại" là hai chuyện trái ngược, mà hai sắc cam nhạt
 * đậm thì nhìn lướt không phân biệt nổi.
 */
const NHAN: Record<string, { ten: string; sac: string }> = {
  NHAP: { ten: 'Nháp', sac: 'bg-nen3 text-mo' },
  CHO_DUYET: { ten: 'Chờ duyệt', sac: 'bg-nhan/12 text-nhan' },
  DANG_HIEN: { ten: 'Đang bày', sac: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' },
  TU_CHOI: { ten: 'Bị trả lại', sac: 'bg-xau/10 text-xau' },
  DA_GO: { ten: 'Đã gỡ', sac: 'bg-nen3 text-mo' },
};

export function NhanTrangThai({ trangThai }: { trangThai: string }) {
  const n = NHAN[trangThai] ?? NHAN.NHAP;
  return (
    <span className={gop('shrink-0 rounded-full px-2 py-1 text-[11px] font-bold', n.sac)}>
      {n.ten}
    </span>
  );
}
