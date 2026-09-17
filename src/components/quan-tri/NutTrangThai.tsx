'use client';

import { useState, useTransition } from 'react';
import { useXacNhan } from '@/components/HopXacNhan';
import { doiTrangThai } from '@/app/(quan-tri)/quan-tri/viec';

/**
 * Nút bày game ra cửa hàng / rút về nháp.
 *
 * Rút về nháp hỏi lại một câu, đăng thì không: đăng nhầm chỉ cần bấm rút là
 * xong, còn rút một game đang có người tải xuống thì mọi đường dẫn tới nó gãy
 * ngay lập tức.
 *
 * Không dùng chung `NutViec` được vì đây là nút CHÍNH của trang, mang dáng nút
 * lớn chứ không phải một nút chữ nhỏ trong hàng công cụ. Nhưng hai thứ
 * `NutViec` làm đúng thì phải chép theo, và chú thích của chính nó đã đoán
 * trước chỗ hỏng: "chỗ quên mất phần bắt lỗi, rồi việc hỏng mà nút vẫn im như
 * không."
 *
 *   • Hỏi bằng `useXacNhan`, không bằng `window.confirm` — hộp của trình duyệt
 *     thì chữ không dịch được và nút nguy hiểm không tô đỏ được.
 *   • ĐỌC kết quả trả về. Bản cũ vứt nó đi, nên game thiếu điều kiện để bày ra
 *     cửa hàng thì bấm Đăng xong nút trở lại như cũ, không một lời nào — người
 *     bày hàng bấm lại vài lần rồi tưởng trang hỏng.
 */
export function NutTrangThai({ gameId, trangThai }: { gameId: string; trangThai: string }) {
  const [dangChay, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();
  const dangHien = trangThai === 'DANG_HIEN';

  const doi = async () => {
    if (dangHien && !(await hoi(
      'Rút game này về nháp? Mọi đường dẫn tới nó sẽ báo không tìm thấy.', true,
    ))) return;
    datLoi(null);
    batDau(async () => {
      const kq = await doiTrangThai(gameId, dangHien ? 'NHAP' : 'DANG_HIEN');
      if (kq?.loi) datLoi(kq.loi);
    });
  };

  return (
    <>
      <button type="button" onClick={doi} disabled={dangChay}
        className={dangHien ? 'nut-vien' : 'nut-cai-dam !min-h-[38px] !px-5 !text-[13px]'}>
        {dangChay ? 'Đang lưu…' : dangHien ? 'Rút về nháp' : 'Đăng'}
      </button>
      {loi && <p role="alert" className="mt-1 text-[12px] font-medium text-xau">{loi}</p>}
      {hop}
    </>
  );
}
