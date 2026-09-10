'use client';

import { useTransition } from 'react';
import { doiTrangThai } from '@/app/quan-tri/viec';

/**
 * Nút đăng game ra kho / rút về nháp.
 *
 * Rút về nháp hỏi lại một câu, đăng thì không: đăng nhầm chỉ cần bấm rút là
 * xong, còn rút một game đang có người tải xuống thì mọi đường dẫn tới nó gãy
 * ngay lập tức.
 */
export function NutTrangThai({ gameId, trangThai }: { gameId: string; trangThai: string }) {
  const [dangChay, batDau] = useTransition();
  const dangHien = trangThai === 'DANG_HIEN';

  const doi = () => {
    if (dangHien && !confirm('Rút game này về nháp? Mọi đường dẫn tới nó sẽ báo không tìm thấy.')) return;
    batDau(async () => { await doiTrangThai(gameId, dangHien ? 'NHAP' : 'DANG_HIEN'); });
  };

  return (
    <button type="button" onClick={doi} disabled={dangChay}
      className={dangHien ? 'nut-vien' : 'nut-cai-dam !min-h-[38px] !px-5 !text-[13px]'}>
      {dangChay ? 'Đang lưu…' : dangHien ? 'Rút về nháp' : 'Đăng'}
    </button>
  );
}
