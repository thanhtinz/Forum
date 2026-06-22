'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { BadgeIcon } from '@/lib/icons';
import { cssToStyle } from '@/lib/nameEffect';

interface OwnedFrame { id: string; frameId: string; name: string; imageUrl: string; expiresAt: string | null; expired: boolean; equipped: boolean }
interface ManageBadge { key: string; label: string; icon: string; color: string; kind: string; description?: string; hidden: boolean }
interface OwnedShopBadge { id: string; badgeId: string; name: string; imageUrl: string; expiresAt: string | null; expired: boolean; equipped: boolean }
interface OwnedEffect { id: string; effectId: string; name: string; css: string; expiresAt: string | null; expired: boolean; equipped: boolean }
interface OwnedBubble { id: string; bubbleId: string; name: string; css: string; expiresAt: string | null; expired: boolean; equipped: boolean }

const dur = (d: string | null, expired: boolean) => (expired ? 'Hết hạn' : d ? `Đến ${new Date(d).toLocaleDateString('vi')}` : 'Vĩnh viễn');

const KIND_LABEL: Record<string, string> = { role: 'Vai trò', verify: 'Xác minh', level: 'Cấp độ', milestone: 'Thành tích', seller: 'Người bán' };

export default function DecorationsSettings() {
  const { user, loading: authLoading } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [frames, setFrames] = useState<OwnedFrame[]>([]);
  const [allBadges, setAllBadges] = useState<ManageBadge[]>([]);
  const [shopBadges, setShopBadges] = useState<OwnedShopBadge[]>([]);
  const [effects, setEffects] = useState<OwnedEffect[]>([]);
  const [bubbles, setBubbles] = useState<OwnedBubble[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (user?.avatar) setAvatar(user.avatar); }, [user]);

  function loadFrames() {
    api.get<OwnedFrame[]>('/avatar-frames/inventory').then(setFrames).catch(() => {});
  }
  function loadBadges() {
    api.get<ManageBadge[]>('/badges/me/manage').then(setAllBadges).catch(() => {});
  }
  function loadShopBadges() {
    api.get<OwnedShopBadge[]>('/badge-products/inventory').then(setShopBadges).catch(() => {});
  }
  function loadEffects() {
    api.get<OwnedEffect[]>('/name-effects/inventory').then(setEffects).catch(() => {});
  }
  function loadBubbles() {
    api.get<OwnedBubble[]>('/chat-bubbles/inventory').then(setBubbles).catch(() => {});
  }
  useEffect(() => { loadFrames(); loadBadges(); loadShopBadges(); loadEffects(); loadBubbles(); }, []);

  async function equipBubble(bubbleId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/chat-bubbles/equip', { bubbleId });
      setBubbles((list) => list.map((x) => ({ ...x, equipped: x.bubbleId === bubbleId })));
      setMsg(bubbleId ? 'Đã bật bong bóng chat. Tải lại trang để thấy ở mọi nơi.' : 'Đã tắt bong bóng chat.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function equipShopBadge(badgeId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/badge-products/equip', { badgeId });
      setShopBadges((list) => list.map((x) => ({ ...x, equipped: x.badgeId === badgeId })));
      setMsg(badgeId ? 'Đã đeo badge. Tải lại trang để thấy ở mọi nơi.' : 'Đã gỡ badge.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function equipEffect(effectId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/name-effects/equip', { effectId });
      setEffects((list) => list.map((x) => ({ ...x, equipped: x.effectId === effectId })));
      setMsg(effectId ? 'Đã bật hiệu ứng tên. Tải lại trang để thấy ở mọi nơi.' : 'Đã tắt hiệu ứng tên.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function toggleBadge(b: ManageBadge) {
    setBusy(true); setMsg('');
    const hidden = !b.hidden;
    try {
      await api.post('/badges/me/visibility', { key: b.key, hidden });
      setAllBadges((list) => list.map((x) => (x.key === b.key ? { ...x, hidden } : x)));
      setMsg(hidden ? 'Đã ẩn huy hiệu.' : 'Đã hiện huy hiệu.');
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
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Kho khung avatar — bật/tắt khung đã có */}
      <div className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Khung avatar của tôi</h2>
          <p className="text-sm text-ink-500">Bấm để ẩn/hiện cạnh tên.</p>
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
            <p className="text-sm text-ink-500">Bấm để ẩn/hiện cạnh tên.</p>
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

      {/* Kho badge cửa hàng — đeo/gỡ badge đã mua */}
      <div className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Badge cửa hàng của tôi</h2>
          <p className="text-sm text-ink-500">Bấm để đeo cạnh tên; bấm lại để gỡ. Mua thêm ở <a href="/game/shop?tab=badge" className="text-brand-600 hover:underline">Cửa hàng</a>.</p>
        </div>
        {shopBadges.length === 0 ? (
          <p className="text-sm text-ink-500">Bạn chưa có badge nào. Ghé <a href="/game/shop?tab=badge" className="text-brand-600 hover:underline">Cửa hàng → Badge</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {shopBadges.map((b) => (
              <button key={b.id} onClick={() => !b.expired && equipShopBadge(b.equipped ? null : b.badgeId)} disabled={busy || b.expired}
                title={b.equipped ? 'Bấm để gỡ badge' : b.name}
                className={`relative flex w-24 flex-col items-center gap-1 rounded-xl border-2 p-2 transition disabled:opacity-50 ${b.equipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.name} className="h-14 w-14 object-contain" />
                <span className="line-clamp-1 text-xs font-medium">{b.name}</span>
                <span className="text-[10px] text-ink-400">{dur(b.expiresAt, b.expired)}</span>
                {b.equipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kho hiệu ứng tên — bật/tắt hiệu ứng đã mua */}
      <div className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Hiệu ứng tên của tôi</h2>
          <p className="text-sm text-ink-500">Bấm để bật; bấm lại để tắt. Mua thêm ở <a href="/game/shop?tab=effect" className="text-brand-600 hover:underline">Cửa hàng</a>.</p>
        </div>
        {effects.length === 0 ? (
          <p className="text-sm text-ink-500">Bạn chưa có hiệu ứng nào. Ghé <a href="/game/shop?tab=effect" className="text-brand-600 hover:underline">Cửa hàng → Hiệu ứng tên</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {effects.map((ef) => (
              <button key={ef.id} onClick={() => !ef.expired && equipEffect(ef.equipped ? null : ef.effectId)} disabled={busy || ef.expired}
                title={ef.equipped ? 'Bấm để tắt hiệu ứng' : ef.name}
                className={`relative flex min-w-[8rem] flex-col items-center gap-1 rounded-xl border-2 p-3 transition disabled:opacity-50 ${ef.equipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                <span className="text-base font-bold" style={cssToStyle(ef.css)}>{user.displayName || user.username}</span>
                <span className="line-clamp-1 text-xs font-medium text-ink-500">{ef.name}</span>
                <span className="text-[10px] text-ink-400">{dur(ef.expiresAt, ef.expired)}</span>
                {ef.equipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kho bong bóng chat — bật/tắt bong bóng đã mua */}
      <div className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Bong bóng chat của tôi</h2>
          <p className="text-sm text-ink-500">Bấm để bật; bấm lại để tắt. Mua thêm ở <a href="/game/shop?tab=bubble" className="text-brand-600 hover:underline">Cửa hàng</a>.</p>
        </div>
        {bubbles.length === 0 ? (
          <p className="text-sm text-ink-500">Bạn chưa có bong bóng nào. Ghé <a href="/game/shop?tab=bubble" className="text-brand-600 hover:underline">Cửa hàng → Bong bóng chat</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {bubbles.map((b) => (
              <button key={b.id} onClick={() => !b.expired && equipBubble(b.equipped ? null : b.bubbleId)} disabled={busy || b.expired}
                title={b.equipped ? 'Bấm để tắt bong bóng' : b.name}
                className={`relative flex min-w-[9rem] flex-col items-center gap-1 rounded-xl border-2 p-3 transition disabled:opacity-50 ${b.equipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                <span className="inline-block max-w-full rounded-2xl px-3 py-1.5 text-sm" style={cssToStyle(b.css)}>Tin nhắn 👋</span>
                <span className="line-clamp-1 text-xs font-medium text-ink-500">{b.name}</span>
                <span className="text-[10px] text-ink-400">{dur(b.expiresAt, b.expired)}</span>
                {b.equipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
