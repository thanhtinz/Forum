'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  choAn, choiBong, cuRaTran, datTen, muaTrung, noTrung, thaRong, thachDau,
  type RongState,
} from '@/app/(site)/rong/actions';

/**
 * Cái ruột dùng chung của mọi màn trong Đảo Rồng.
 *
 * Sáu trang thì bốn trang cần đúng ba thứ y hệt nhau: một đồng hồ chạy tiếp từ
 * mốc máy chủ, một chỗ hứng lời nhắn của server action, và một hàm gọi việc.
 * Chép ba thứ ấy ra bốn bản là bốn chỗ để lệch nhau về sau.
 *
 * Đồng hồ lấy mốc từ máy chủ (`now0`) rồi mới tự chạy: dùng `Date.now()` của
 * máy người xem ngay lần dựng đầu thì máy nào lệch giờ là React kêu sai lệch
 * dựng hình ngay giây đầu tiên.
 */

const VIEC = {
  trung: muaTrung, no: noTrung, an: choAn, choi: choiBong,
  ten: datTen, 'ra-tran': cuRaTran, dau: thachDau, tha: thaRong,
} as const;

export type ViecRong = keyof typeof VIEC;

export function useViecRong(now0: number) {
  const router = useRouter();
  const [now, setNow] = useState(now0);
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lam = (viec: ViecRong, truong: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, v);
    batDau(async () => {
      setTin(await VIEC[viec]({}, fd));
      router.refresh();
    });
  };

  return { now, tin, dangLam, lam };
}

/** Hai dòng nhắn — làm xong thì xanh, hỏng thì đỏ. */
export function TinRong({ tin }: { tin: RongState }) {
  if (!tin.ke && !tin.error) return null;
  return (
    <>
      {tin.ke && <p className="text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="text-sm text-red-600">{tin.error}</p>}
    </>
  );
}
