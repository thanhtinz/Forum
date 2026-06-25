'use client';

import { useEffect, useState } from 'react';
import { Cake, MapPin, UserCircle, Tag, PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface About { displayName?: string | null; bio?: string | null; location?: string | null; birthday?: string | null; showBirthday?: boolean; birthdayFormat?: string; signature?: string | null }

const FORMATS = [
  { value: 'full', label: 'Đầy đủ (ngày/tháng/năm)' },
  { value: 'day_month', label: 'Ngày & tháng' },
  { value: 'month_year', label: 'Tháng & năm' },
  { value: 'year', label: 'Chỉ năm sinh' },
];

export default function AboutSettings() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [showBirthday, setShowBirthday] = useState(false);
  const [birthdayFormat, setBirthdayFormat] = useState('full');
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<About>('/users/me/about').then((a) => {
      setDisplayName(a.displayName || '');
      setBio(a.bio || '');
      setLocation(a.location || '');
      setShowBirthday(!!a.showBirthday);
      setBirthdayFormat(a.birthdayFormat || 'full');
      setSignature(a.signature || '');
      if (a.birthday) {
        const d = new Date(a.birthday);
        setDay(String(d.getUTCDate()));
        setMonth(String(d.getUTCMonth() + 1));
        setYear(String(d.getUTCFullYear()));
      }
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true); setMsg('');
    // Ghép ngày sinh từ 3 ô; thiếu ngày/tháng thì mặc định 01, không có năm thì coi như chưa đặt
    let birthday: string | null = null;
    if (year.trim()) {
      const y = year.trim().padStart(4, '0');
      const m = (month.trim() || '1').padStart(2, '0');
      const dd = (day.trim() || '1').padStart(2, '0');
      birthday = `${y}-${m}-${dd}`;
    }
    try {
      await api.patch('/users/me', {
        displayName: displayName.trim(),
        bio,
        location,
        birthday,
        showBirthday,
        birthdayFormat,
        signature,
      });
      setMsg('Đã lưu thông tin ✓');
      refresh?.();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập để chỉnh sửa.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thông tin & Giới thiệu</h1>

      <div className="card space-y-4 p-5">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Tag size={15} /> Tên hiển thị</label>
          <input
            className="input w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị của bạn"
            maxLength={100}
          />
          <p className="mt-1 text-xs text-ink-400">Để trống sẽ dùng tên đăng nhập @{user.username}.</p>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><UserCircle size={15} /> Giới thiệu về bạn</label>
          <textarea
            className="input w-full"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Vài dòng giới thiệu về bản thân…"
            maxLength={1000}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><MapPin size={15} /> Nơi ở</label>
          <input
            className="input w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="vd: Hà Nội, Việt Nam"
            maxLength={120}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Cake size={15} /> Ngày sinh</label>
          <div className="flex gap-2">
            <input type="number" min={1} max={31} className="input w-20" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Ngày" />
            <input type="number" min={1} max={12} className="input w-20" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Tháng" />
            <input type="number" min={1900} max={2100} className="input w-28" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Năm" />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={showBirthday} onChange={(e) => setShowBirthday(e.target.checked)} />
              Hiển thị ngày sinh công khai
            </label>
            <select className="input" value={birthdayFormat} onChange={(e) => setBirthdayFormat(e.target.value)} disabled={!showBirthday}>
              {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <p className="mt-1 text-xs text-ink-400">Bạn có thể chọn chỉ hiện năm sinh, ngày–tháng, hoặc tháng–năm để giữ riêng tư.</p>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><PenLine size={15} /> Chữ ký (hiển thị dưới bài viết)</label>
          <textarea
            className="input w-full font-mono text-sm"
            rows={3}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Chữ ký hiển thị bên dưới mỗi bài viết của bạn…"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-ink-400">Tối đa 500 ký tự. Hỗ trợ văn bản thuần.</p>
        </div>

        {msg && <p className="text-sm text-brand-600">{msg}</p>}

        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}
