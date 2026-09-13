'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { X } from 'lucide-react';
import { boDeDanh } from '@/app/(cua-hang)/game/[duongDan]/viec-de-danh';

/**
 * Nút bỏ một game khỏi danh sách để dành, đứng ở cuối mỗi hàng.
 *
 * Trước đợt này muốn bỏ một game phải mở trang game rồi bấm lại dấu trang —
 * ba nhịp cho một việc đáng lẽ một nhịp, mà danh sách để dành thì đúng là chỗ
 * người ta ngồi dọn.
 *
 * Gọi `router.refresh()` sau khi xoá chứ không tự cắt hàng khỏi danh sách
 * trong bộ nhớ trang: máy chủ vẫn là chỗ giữ sự thật, và dòng "N game bạn
 * đánh dấu" ở đầu trang cũng phải đếm lại theo.
 */
export function NutBoDeDanh({ gameId, ten }: { gameId: string; ten: string }) {
  const router = useRouter();
  const [dangGui, batDau] = useTransition();

  return (
    <button type="button" disabled={dangGui}
      onClick={() => batDau(async () => { await boDeDanh(gameId); router.refresh(); })}
      aria-label={`Bỏ ${ten} khỏi danh sách để dành`}
      className="grid size-9 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-nen3 hover:text-xau disabled:opacity-40">
      <X size={17} aria-hidden />
    </button>
  );
}
