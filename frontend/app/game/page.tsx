'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Swords, Heart, Zap, Brain, Sprout, Fish, Shirt, Trophy, Shield, HeartPulse, Sword } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Character {
  id: string; level: number; exp: number; coinBalance: number; combatPower: number;
  strength: number; vitality: number; agility: number; intelligence: number;
  statPoints: number; gender: string;
}

const SUB = [
  { href: '/game/farm', label: 'Nông trại', icon: Sprout, color: 'text-emerald-600' },
  { href: '/game/fishing', label: 'Câu cá', icon: Fish, color: 'text-sky-600' },
  { href: '/game/shop', label: 'Cửa hàng', icon: Sword, color: 'text-amber-600' },
  { href: '/game/survival', label: 'Sinh tồn', icon: HeartPulse, color: 'text-teal-600' },
  { href: '/game/wardrobe', label: 'Tủ đồ / Pet', icon: Shirt, color: 'text-fuchsia-600' },
  { href: '/game/guild', label: 'Bang hội', icon: Shield, color: 'text-indigo-600' },
  { href: '/game/pvp', label: 'Đấu trường', icon: Swords, color: 'text-rose-600' },
  { href: '/minigame', label: 'Minigame', icon: Trophy, color: 'text-amber-600' },
];

export default function GamePage() {
  const { user, loading } = useAuth();
  const [char, setChar] = useState<Character | null>(null);
  const [state, setState] = useState<'load' | 'none' | 'ok'>('load');

  useEffect(() => {
    if (loading) return;
    if (!user) { setState('none'); return; }
    api.get<Character>('/game/character')
      .then((c) => { setChar(c); setState('ok'); })
      .catch(() => setState('none'));
  }, [user, loading]);

  async function createChar(gender: 'MALE' | 'FEMALE') {
    try {
      const c = await api.post<Character>('/game/character', { gender });
      setChar(c); setState('ok');
    } catch {}
  }

  if (state === 'load') return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  if (!user) return (
    <div className="card p-8 text-center">
      <p className="text-ink-500">Đăng nhập để chơi game.</p>
      <Link href="/login" className="btn-primary mt-3 inline-flex">Đăng nhập</Link>
    </div>
  );

  if (state === 'none' || !char) return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">Tạo nhân vật</h1>
      <p className="mt-1 text-ink-500">Chọn giới tính để bắt đầu hành trình.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={() => createChar('MALE')} className="btn-primary">♂ Nam</button>
        <button onClick={() => createChar('FEMALE')} className="btn-outline">♀ Nữ</button>
      </div>
    </div>
  );

  const stats = [
    { label: 'Sức mạnh', value: char.strength, icon: Swords },
    { label: 'Thể lực', value: char.vitality, icon: Heart },
    { label: 'Nhanh nhẹn', value: char.agility, icon: Zap },
    { label: 'Trí tuệ', value: char.intelligence, icon: Brain },
  ];

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nhân vật của bạn</h1>
            <p className="text-white/85">Cấp {char.level} · Sức mạnh chiến đấu {char.combatPower}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-lg font-bold">
            <Coins size={20} /> {char.coinBalance.toLocaleString()} coin
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-ink-200/70 sm:grid-cols-4 dark:bg-ink-800">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-4 text-center dark:bg-ink-900">
              <s.icon className="mx-auto text-brand-500" size={20} />
              <div className="mt-1 text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-ink-500">{s.label}</div>
            </div>
          ))}
        </div>
        {char.statPoints > 0 && (
          <div className="border-t border-ink-200/70 p-3 text-center text-sm text-brand-600 dark:border-ink-800">
            Bạn có {char.statPoints} điểm tiềm năng chưa phân bổ.
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUB.map((s) => (
          <Link key={s.href} href={s.href} className="card flex flex-col items-center gap-2 p-5 hover:shadow-lg">
            <s.icon className={s.color} size={28} />
            <span className="text-sm font-medium">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
