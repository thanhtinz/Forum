'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface U {
  id: string; username: string; displayName?: string; email?: string;
  role: string; status: string; gemBalance?: number;
  gameCharacter?: { coinBalance: number } | null;
}
const ROLES = ['MEMBER', 'VIP', 'MODERATOR', 'ADMIN'];

export default function AdminUsers() {
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    api.get<{ data: U[] }>(`/admin/users?search=${encodeURIComponent(search)}`).then((r) => setUsers(r.data)).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const act = async (fn: () => Promise<any>, ok = 'Đã cập nhật') => { try { await fn(); setMsg(ok); } catch (e: any) { setMsg(e.message); } load(); };

  function adjustGem(u: U) {
    const v = prompt(`Cộng/trừ GEM cho @${u.username} (số âm để trừ). Hiện: ${u.gemBalance ?? 0}`, '0');
    if (v === null) return; const amount = Number(v); if (!amount) return;
    act(() => api.post(`/admin/users/${u.id}/gem`, { amount, note: 'Admin điều chỉnh' }), `Đã ${amount > 0 ? '+' : ''}${amount} gem`);
  }
  function adjustCoin(u: U) {
    const cur = u.gameCharacter?.coinBalance ?? 0;
    const v = prompt(`Cộng/trừ XU (coin game) cho @${u.username} (số âm để trừ). Hiện: ${cur}`, '0');
    if (v === null) return; const amount = Number(v); if (!amount) return;
    act(() => api.post(`/admin/users/${u.id}/coin`, { amount, note: 'Admin điều chỉnh' }), `Đã ${amount > 0 ? '+' : ''}${amount} xu`);
  }
  function editInfo(u: U) {
    const displayName = prompt(`Tên hiển thị của @${u.username}:`, u.displayName || '');
    if (displayName === null) return;
    const email = prompt(`Email của @${u.username}:`, u.email || '');
    if (email === null) return;
    act(() => api.patch(`/admin/users/${u.id}/info`, { displayName, email }), 'Đã sửa thông tin');
  }
  function resetPwd(u: U) {
    const password = prompt(`Mật khẩu mới cho @${u.username} (tối thiểu 6 ký tự):`, '');
    if (!password) return;
    act(() => api.post(`/admin/users/${u.id}/reset-password`, { password }), 'Đã đặt lại mật khẩu');
  }
  function removeUser(u: U) {
    if (!confirm(`XOÁ vĩnh viễn @${u.username}? Mọi dữ liệu (bài viết, nhân vật game…) sẽ bị xoá theo. Không thể hoàn tác.`)) return;
    act(() => api.del(`/admin/users/${u.id}`), 'Đã xoá user');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quản lý người dùng</h1>
      <div className="flex gap-2">
        <input className="input" placeholder="Tìm username/email…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button onClick={load} className="btn-primary">Tìm</button>
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr><th className="p-3">User</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Gem</th><th className="p-3">Xu</th><th className="p-3">Hành động</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3">{u.displayName || u.username}<div className="text-xs text-ink-400">@{u.username}</div></td>
                <td className="p-3">
                  <select className="input !py-1" value={u.role} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}/role`, { role: e.target.value }), 'Đã đổi vai trò')}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-3">{u.status}</td>
                <td className="p-3 tabular-nums">{u.gemBalance ?? 0}</td>
                <td className="p-3 tabular-nums">{u.gameCharacter?.coinBalance ?? 0}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.status === 'BANNED'
                      ? <button onClick={() => act(() => api.post(`/admin/users/${u.id}/unban`), 'Đã gỡ ban')} className="btn-outline !py-1 text-xs">Gỡ ban</button>
                      : <button onClick={() => act(() => api.post(`/admin/users/${u.id}/ban`, { reason: 'Vi phạm' }), 'Đã ban')} className="btn-outline !py-1 text-xs text-red-600">Ban</button>}
                    <button onClick={() => adjustGem(u)} className="btn-outline !py-1 text-xs">+Gem</button>
                    <button onClick={() => adjustCoin(u)} className="btn-outline !py-1 text-xs">+Xu</button>
                    <button onClick={() => editInfo(u)} className="btn-outline !py-1 text-xs">Sửa</button>
                    <button onClick={() => resetPwd(u)} className="btn-outline !py-1 text-xs">Mật khẩu</button>
                    <button onClick={() => { if (confirm('Dọn spam: BAN user này và xoá toàn bộ bài/chủ đề/profile post của họ?')) act(() => api.post(`/admin/users/${u.id}/spam-clean`, { reason: 'Spam' }), 'Đã dọn spam'); }} className="btn-outline !py-1 text-xs text-red-600" title="Ban + xoá sạch nội dung">Dọn spam</button>
                    <button onClick={() => removeUser(u)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-500">Không có người dùng.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
