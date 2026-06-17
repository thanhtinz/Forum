'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabledServer, setEnabledServer] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pubKey, setPubKey] = useState('');

  useEffect(() => {
    const sup = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(sup);
    api.get<{ enabled: boolean; publicKey: string }>('/notifications/push/key').then((r) => { setEnabledServer(r.enabled); setPubKey(r.publicKey); }).catch(() => {});
    if (sup) navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription().then((s) => setSubscribed(!!s)));
  }, []);

  async function enable() {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setMsg('Bạn đã từ chối quyền thông báo.'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(pubKey) });
      await api.post('/notifications/push/subscribe', sub.toJSON());
      setSubscribed(true); setMsg('Đã bật thông báo trình duyệt ✓');
    } catch (e: any) { setMsg('Lỗi: ' + (e?.message || 'không bật được')); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      setSubscribed(false); setMsg('Đã tắt thông báo trình duyệt.');
    } catch (e: any) { setMsg(e?.message); }
    finally { setBusy(false); }
  }

  if (!enabledServer || !supported) return null;
  return (
    <div className="flex items-center gap-2">
      {subscribed ? (
        <button onClick={disable} disabled={busy} className="btn-outline inline-flex items-center gap-1 text-sm"><BellOff size={15} /> Tắt thông báo trình duyệt</button>
      ) : (
        <button onClick={enable} disabled={busy} className="btn-primary inline-flex items-center gap-1 text-sm"><Bell size={15} /> Bật thông báo trình duyệt</button>
      )}
      {msg && <span className="text-xs text-ink-500">{msg}</span>}
    </div>
  );
}

export default PushToggle;
