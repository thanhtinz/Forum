'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Bốn màn của một ván: bắt đầu → diễn ra → kết thúc → kết quả.
 *
 * Vì sao phải có: server action trả lời trong vài chục mili giây, nên bấm cái
 * là con số nhảy ngay — không ai kịp thấy xúc xắc lăn hay bóng bay. Ván nào
 * cũng như ván nào, thắng thua chỉ khác nhau ở dòng chữ.
 *
 * Nhưng KHÔNG được kéo dài bằng cách ngủ ở máy chủ: kết quả đã có rồi thì cứ
 * gửi về, phần câu giờ là việc của trình duyệt. Ở đây giữ kết quả lại cho tới
 * khi diễn xong, còn nếu máy chủ trả lời chậm hơn hoạt cảnh thì hoạt cảnh chờ
 * máy chủ chứ không cắt ngang giữa chừng.
 */
export type Man = 'cho' | 'batdau' | 'dienra' | 'ketthuc' | 'ketqua';

/** Nhịp từng màn, tính bằng mili giây. */
export const NHIP = { batdau: 260, dienra: 1100, ketthuc: 420 } as const;

/** Tổng thời gian tối thiểu từ lúc bấm tới lúc lộ kết quả. */
export const NHIP_TONG = NHIP.batdau + NHIP.dienra + NHIP.ketthuc;

/**
 * @param dangChay  server action còn đang chạy
 * @param ketQua    đối tượng kết quả; đổi tham chiếu là có ván mới
 */
export function useMan(dangChay: boolean, ketQua: unknown): Man {
  const [man, setMan] = useState<Man>('cho');
  const batDauLuc = useRef(0);
  const kqCu = useRef(ketQua);
  const hen = useRef<ReturnType<typeof setTimeout>[]>([]);

  const don = () => { hen.current.forEach(clearTimeout); hen.current = []; };

  // Bấm nút: vào màn mở đầu ngay, không đợi máy chủ.
  useEffect(() => {
    if (!dangChay) return;
    don();
    batDauLuc.current = Date.now();
    setMan('batdau');
    hen.current.push(setTimeout(() => setMan('dienra'), NHIP.batdau));
    return don;
  }, [dangChay]);

  // Kết quả về: diễn nốt phần còn thiếu rồi mới lộ.
  useEffect(() => {
    if (ketQua === kqCu.current) return;
    kqCu.current = ketQua;
    if (!batDauLuc.current) return;

    const daDien = Date.now() - batDauLuc.current;
    const conThieu = Math.max(0, NHIP.batdau + NHIP.dienra - daDien);
    don();
    hen.current.push(setTimeout(() => setMan('ketthuc'), conThieu));
    hen.current.push(setTimeout(() => setMan('ketqua'), conThieu + NHIP.ketthuc));
    return don;
  }, [ketQua]);

  useEffect(() => don, []);
  return man;
}

/** Đang trong lúc diễn, chưa được lộ kết quả. */
export function dangDien(man: Man): boolean {
  return man === 'batdau' || man === 'dienra' || man === 'ketthuc';
}
