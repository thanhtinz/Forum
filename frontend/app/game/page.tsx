'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Sprout, Fish, Shirt, Trophy, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Character { id: string; gender: string }

// Khu trò chơi casual — không còn nhân vật/chỉ số RPG
const SUB = [
  { href: '/game/farm', label: 'Nông trại', icon: Sprout, color: 'text-emerald-600' },
  { href: '/game/fishing', label: 'Câu cá', icon: Fish, color: 'text-sky-600' },
  { href: '/game/shop', label: 'Cửa hàng', icon: ShoppingBag, color: 'text-amber-600' },
  { href: '/game/wardrobe', label: 'Tủ đồ / Pet', icon: Shirt, color: 'text-fuchsia-600' },
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

  // Lần đầu vào: tạo hồ sơ chơi (cần cho nông trại/câu cá/coin) — không hiển thị chỉ số
  if (state === 'none' || !char) return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">Bắt đầu chơi</h1>
      <p className="mt-1 text-ink-500">Chọn ảnh đại diện để bắt đầu.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={() => createChar('MALE')} className="btn-primary">♂ Nam</button>
        <button onClick={() => createChar('FEMALE')} className="btn-outline">♀ Nữ</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-card">
        <Gamepad2 size={28} />
        <div>
          <h1 className="text-2xl font-bold">Khu trò chơi</h1>
          <p className="text-sm text-white/85">Nông trại, câu cá, thú cưng và minigame</p>
        </div>
      </header>

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
