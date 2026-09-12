'use client';

import { Send, Undo2 } from 'lucide-react';
import { NutViec } from '@/components/quan-tri/NutViec';
import { guiDuyet, rutVeNhap } from '@/app/(quan-tri)/quan-tri/viec';

/*
 * Nút gửi duyệt / rút về, đổi theo trạng thái đang có.
 *
 * Game đang bày thì KHÔNG có nút nào: muốn gỡ xuống là việc của ban quản trị,
 * vì gỡ một game đang có người tải về ảnh hưởng tới cả khu diễn đàn quanh nó.
 */
export function NutGuiDuyet({ gameId, trangThai }: { gameId: string; trangThai: string }) {
  if (trangThai === 'CHO_DUYET') {
    return (
      <NutViec nhan={<><Undo2 size={14} aria-hidden /> Rút về nháp</>}
        xacNhan="Rút game khỏi hàng chờ duyệt?"
        lam={() => rutVeNhap(gameId)} />
    );
  }

  if (trangThai === 'DANG_HIEN') return null;

  return (
    <NutViec nhan={<><Send size={14} aria-hidden /> Gửi duyệt</>}
      className="!bg-nhan/12 !text-nhan hover:!bg-nhan/20"
      xacNhan="Gửi game này cho ban quản trị duyệt?"
      lam={() => guiDuyet(gameId)} />
  );
}
