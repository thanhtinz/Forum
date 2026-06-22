'use client';

import { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { BadgeIcon } from '@/lib/icons';

interface OwnedFrame { id: string; frameId: string; name: string; imageUrl: string; expiresAt: string | null; expired: boolean; equipped: boolean }
interface VipReward { tierId: string; tierName: string; badgeUrl: string | null; frameUrl: string | null; color: string | null; gemRequired: number; badgeEquipped: boolean }
interface ManageBadge { key: string; label: string; icon: string; color: string; kind: string; description?: string; hidden: boolean }

const KIND_LABEL: Record<string, string> = { role: 'Vai trò', verify: 'Xác minh', level: 'Cấp độ', milestone: 'Thành tích', seller: 'Người bán' };

export default function DecorationsSettings() {
  const { user, loading: authLoading } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [frames, setFrames] = useState<OwnedFrame[]>([]);
  const [vipRewards, setVipRewards] = useState<VipReward[]>([]);
  const [allBadges, setAllBadges] = useState<ManageBadge[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (user?.avatar) setAvatar(user.avatar); }, [user]);

  function loadFrames() {
    api.get<OwnedFrame[]>('/avatar-frames/inventory').then(setFrames).catch(() => {});
  }
  function loadVipRewards() {
    api.get<VipReward[]>('/vip/my-rewards').then(setVipRewards).catch(() => {});
  }
  function loadBadges() {
    api.get<ManageBadge[]>('/badges/me/manage').then(setAllBadges).catch(() => {});
  }
  useEffect(() => { loadFrames(); loadVipRewards(); loadBadges(); }, []);

  async function toggleBadge(b: ManageBadge) {
    setBusy(true); setMsg('');
    const hidden = !b.hidden;
    try {
      await api.post('/badges/me/visibility', { key: b.key, hidden });
      setAllBadges((list) => list.map((x) => (x.key === b.key ? { ...x, hidden } : x)));
      setMsg(hidden ? 'Đã ẩn huy hiệu.' : 'Đã hiện huy hiệu.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function equipBadge(tierId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/vip/equip-badge', { tierId });
      setVipRewards((list) => list.map((x) => ({ ...x, badgeEquipped: x.tierId === tierId })));
      setMsg(tierId ? 'Đã bật huy hiệu VIP. Tải lại trang để thấy ở mọi nơi.' : 'Đã tắt huy hiệu VIP.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function equipFrame(frameId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/avatar-frames/equip', { frameId });
      setFrames((list) => list.map((x) => ({ ...x, equipped: x.frameId === frameId })));
      setMsg(frameId ? 'Đã bật khung. Tải lại trang để thấy ở mọi nơi.' : 'Đã tắt khung.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập để quản lý trang trí.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Trang trí</h1>
        <a href="/settings/avatar" className="inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-medium hover:bg-ink-200 dark:bg-ink-800">
          <ImageIcon size={15} /> Ảnh đại diện
        </a>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Kho khung avatar — bật/tắt khung đã có */}
      <div className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Khung avatar của tôi</h2>
          <p className="text-sm text-ink-500">Bấm vào khung để bật; bấm lại để tắt. Mua thêm ở <a href="/game/shop?tab=frame" className="text-brand-600 hover:underline">Cửa hàng</a>.</p>
        </div>
        {frames.length === 0 ? (
          <p className="text-sm text-ink-500">Bạn chưa có khung nào. Ghé <a href="/game/shop?tab=frame" className="text-brand-600 hover:underline">Cửa hàng → Khung avatar</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {frames.map((f) => (
              <button key={f.id} onClick={() => !f.expired && equipFrame(f.equipped ? null : f.frameId)} disabled={busy || f.expired}
                title={f.equipped ? 'Bấm để tắt khung' : f.name}
                className={`relative flex w-24 flex-col items-center gap-1 rounded-xl border-2 p-2 transition disabled:opacity-50 ${f.equipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                <Avatar user={{ username: user.username, avatar, avatarFrameUrl: f.imageUrl }} size={56} />
                <span className="line-clamp-1 text-xs font-medium">{f.name}</span>
                <span className="text-[10px] text-ink-400">{f.expired ? 'Hết hạn' : f.expiresAt ? `Đến ${new Date(f.expiresAt).toLocaleDateString('vi')}` : 'Vĩnh viễn'}</span>
                {f.equipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tất cả huy hiệu — bật/tắt hiển thị cạnh tên */}
      {allBadges.length > 0 && (
        <div className="card space-y-3 p-5">
          <div>
            <h2 className="font-semibold">Huy hiệu của tôi</h2>
            <p className="text-sm text-ink-500">Toàn bộ huy hiệu bạn đang có (vai trò, xác minh, cấp độ, thành tích). Bấm để ẩn/hiện cạnh tên.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {allBadges.map((b) => {
              const hex = typeof b.color === 'string' && b.color.startsWith('#');
              return (
                <button key={b.key} onClick={() => toggleBadge(b)} disabled={busy}
                  title={`${b.label}${b.description ? ` — ${b.description}` : ''} · ${KIND_LABEL[b.kind] || b.kind}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${b.hidden ? 'border-dashed border-ink-300 text-ink-400 dark:border-ink-700' : 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'}`}>
                  {hex
                    ? <span style={{ color: b.color }}><BadgeIcon icon={b.icon} size={14} /></span>
                    : <BadgeIcon icon={b.icon} size={14} />}
                  <span className={b.hidden ? 'line-through' : ''}>{b.label}</span>
                  {b.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kho huy hiệu VIP — bật/tắt badge đã nhận */}
      {vipRewards.length > 0 && (
        <div className="card space-y-3 p-5">
          <div>
            <h2 className="font-semibold">Huy hiệu VIP của tôi</h2>
            <p className="text-sm text-ink-500">Mọi mốc VIP đã đạt được giữ vĩnh viễn. Bấm để bật huy hiệu cạnh tên; bấm lại để tắt.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {vipRewards.filter((v) => v.badgeUrl).map((v) => (
              <button key={v.tierId} onClick={() => equipBadge(v.badgeEquipped ? null : v.tierId)} disabled={busy}
                title={v.badgeEquipped ? 'Bấm để tắt huy hiệu' : v.tierName}
                className={`relative flex w-24 flex-col items-center gap-1 rounded-xl border-2 p-2 transition disabled:opacity-50 ${v.badgeEquipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.badgeUrl!} alt={v.tierName} className="h-14 w-14 object-contain" />
                <span className="line-clamp-1 text-xs font-medium" style={v.color ? { color: v.color } : undefined}>{v.tierName}</span>
                {v.badgeEquipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
