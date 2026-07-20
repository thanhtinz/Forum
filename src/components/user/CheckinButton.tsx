'use client';

import { useState, useTransition } from 'react';
import { CalendarCheck } from 'lucide-react';
import { checkinAction } from '@/app/(site)/user/dashboard/actions';

export function CheckinButton({ checkedInToday, streak }: { checkedInToday: boolean; streak: number }) {
  const [done, setDone] = useState(checkedInToday);
  const [curStreak, setStreak] = useState(streak);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onClick = () => start(async () => {
    const r = await checkinAction();
    if (r.error) return setMsg(r.error);
    setDone(true);
    if (r.streak) setStreak(r.streak);
    setMsg(r.already ? 'Hôm nay bạn đã điểm danh rồi.' : `+${r.earned} điểm! Chuỗi ${r.streak} ngày 🔥`);
  });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button type="button" onClick={onClick} disabled={done || pending}
        className={done ? 'btn bg-green-500 text-white' : 'btn-primary'}>
        <CalendarCheck size={16} />
        {done ? `Đã điểm danh · chuỗi ${curStreak} ngày` : pending ? 'Đang điểm danh…' : 'Điểm danh hôm nay'}
      </button>
      {msg && <span className="text-xs font-medium text-brand-600">{msg}</span>}
    </div>
  );
}
