'use client';

import { useEffect, useState } from 'react';
import { Users, CheckSquare, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Btn, Notice, Empty } from '@/components/admin/ui';

interface U {
  id: string; username: string; displayName?: string; email?: string;
  role: string; status: string; gemBalance?: number;
  createdAt?: string; lastSeenAt?: string | null;
  gameCharacter?: { coinBalance: number } | null;
}
interface CatalogBadge { id: string; name: string; description?: string; icon: string; color: string; isAuto: boolean }
const ROLES = ['MEMBER', 'VIP', 'MODERATOR', 'ADMIN'];
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'BANNED', label: 'Đã ban' },
  { value: 'SUSPENDED', label: 'Tạm khoá' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<U[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [badgeUser, setBadgeUser] = useState<U | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function load(p = page) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    params.set('page', String(p));
    params.set('limit', '25');
    api.get<{ data: U[]; meta: { total: number; totalPages: number } }>(`/admin/users?${params.toString()}`)
      .then((r) => { setUsers(r.data); setTotal(r.meta.total); setTotalPages(r.meta.totalPages); setPage(p); setSelected(new Set()); })
      .catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [role, status]);

  const act = async (fn: () => Promise<any>, ok = 'Đã cập nhật') => { try { await fn(); setMsg(ok); } catch (e: any) { setMsg(e.message); } load(page); };

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

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    setSelected((prev) => prev.size === users.length ? new Set() : new Set(users.map((u) => u.id)));
  }

  async function bulkSetRole(newRole: string) {
    if (!selected.size || !confirm(`Đổi vai trò ${selected.size} user thành ${newRole}?`)) return;
    setBulkBusy(true);
    try { const r = await api.patch<{ count: number }>('/admin/users/bulk/role', { userIds: [...selected], role: newRole }); setMsg(`Đã đổi vai trò ${r.count} user`); }
    catch (e: any) { setMsg(e.message); }
    finally { setBulkBusy(false); load(page); }
  }
  async function bulkBan() {
    if (!selected.size) return;
    const reason = prompt(`Lý do ban ${selected.size} user:`, 'Vi phạm');
    if (reason === null) return;
    setBulkBusy(true);
    try { const r = await api.post<{ count: number; skipped: number }>('/admin/users/bulk/ban', { userIds: [...selected], reason }); setMsg(`Đã ban ${r.count} user${r.skipped ? ` (bỏ qua ${r.skipped})` : ''}`); }
    catch (e: any) { setMsg(e.message); }
    finally { setBulkBusy(false); load(page); }
  }

  return (
    <div className="space-y-5">
      <PageHeader icon={<Users size={20} />} title="Quản lý người dùng" desc={`Tìm, phân quyền, điều chỉnh số dư, ban và quản lý huy hiệu. Tổng ${total} người dùng.`} />
      <Card pad={false} className="flex flex-wrap gap-2 p-3">
        <input className="input min-w-[200px] flex-1" placeholder="Tìm username/email…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Btn onClick={() => load(1)}>Tìm</Btn>
      </Card>

      {selected.size > 0 && (
        <Card pad={false} className="flex flex-wrap items-center gap-2 border-brand-300 bg-brand-50/60 p-3 dark:border-brand-800 dark:bg-brand-950/20">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">Đã chọn {selected.size} user</span>
          <select disabled={bulkBusy} onChange={(e) => { if (e.target.value) { bulkSetRole(e.target.value); e.target.value = ''; } }} className="input w-auto !py-1 text-xs" defaultValue="">
            <option value="" disabled>Đổi vai trò thành…</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Btn size="sm" variant="danger" disabled={bulkBusy} onClick={bulkBan}>Ban tất cả</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
        </Card>
      )}

      {msg && <Notice kind={/lỗi|error|Không/i.test(msg) ? 'error' : 'success'}>{msg}</Notice>}
      <Card pad={false} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr>
              <th className="p-3">
                <button onClick={toggleSelectAll} className="flex items-center text-ink-400 hover:text-brand-600">
                  {selected.size === users.length && users.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="p-3">User</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Gem</th><th className="p-3">Xu</th><th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-ink-100 dark:border-ink-800 ${selected.has(u.id) ? 'bg-brand-50/40 dark:bg-brand-950/10' : ''}`}>
                <td className="p-3">
                  <button onClick={() => toggleSelect(u.id)} className="flex items-center text-ink-400 hover:text-brand-600">
                    {selected.has(u.id) ? <CheckSquare size={16} className="text-brand-600" /> : <Square size={16} />}
                  </button>
                </td>
                <td className="p-3">{u.displayName || u.username}<div className="text-xs text-ink-400">@{u.username}</div></td>
                <td className="p-3">
                  <select className="input !py-1" value={u.role} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}/role`, { role: e.target.value }), 'Đã đổi vai trò')}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <span className={`chip text-xs ${u.status === 'BANNED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40' : u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40' : 'bg-ink-200 text-ink-700 dark:bg-ink-800'}`}>{u.status}</span>
                </td>
                <td className="p-3 tabular-nums">{u.gemBalance ?? 0}</td>
                <td className="p-3 tabular-nums">{u.gameCharacter?.coinBalance ?? 0}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.status === 'BANNED'
                      ? <button onClick={() => act(() => api.post(`/admin/users/${u.id}/unban`), 'Đã gỡ ban')} className="btn-outline !py-1 text-xs">Gỡ ban</button>
                      : u.role !== 'ADMIN' && <button onClick={() => act(() => api.post(`/admin/users/${u.id}/ban`, { reason: 'Vi phạm' }), 'Đã ban')} className="btn-outline !py-1 text-xs text-red-600">Ban</button>}
                    <button onClick={() => adjustGem(u)} className="btn-outline !py-1 text-xs">+Gem</button>
                    <button onClick={() => adjustCoin(u)} className="btn-outline !py-1 text-xs">+Xu</button>
                    <button onClick={() => editInfo(u)} className="btn-outline !py-1 text-xs">Sửa</button>
                    <button onClick={() => setBadgeUser(u)} className="btn-outline !py-1 text-xs">Huy hiệu</button>
                    <button onClick={() => resetPwd(u)} className="btn-outline !py-1 text-xs">Mật khẩu</button>
                    <button onClick={() => { if (confirm('Dọn spam: BAN user này và xoá toàn bộ bài/chủ đề/profile post của họ?')) act(() => api.post(`/admin/users/${u.id}/spam-clean`, { reason: 'Spam' }), 'Đã dọn spam'); }} className="btn-outline !py-1 text-xs text-red-600" title="Ban + xoá sạch nội dung">Dọn spam</button>
                    <button onClick={() => removeUser(u)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <Empty icon={<Users size={28} />} title="Không có người dùng nào khớp bộ lọc." />}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Trước</Btn>
          <span className="text-sm text-ink-500">Trang {page}/{totalPages}</span>
          <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Sau →</Btn>
        </div>
      )}

      {badgeUser && <BadgeManager user={badgeUser} onClose={() => setBadgeUser(null)} />}
    </div>
  );
}

// ── Modal gắn/gỡ huy hiệu cho 1 user ──
function BadgeManager({ user, onClose }: { user: U; onClose: () => void }) {
  const [catalog, setCatalog] = useState<CatalogBadge[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    api.get<CatalogBadge[]>('/badges/catalog').then(setCatalog).catch((e) => setMsg(e.message));
    api.get<{ badges: { key: string }[] }>(`/badges/user/${user.id}`)
      .then((r) => setOwned(new Set(r.badges.filter((b) => b.key.startsWith('milestone:')).map((b) => b.key.slice('milestone:'.length)))))
      .catch(() => {});
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.id]);

  async function toggle(badgeId: string, has: boolean) {
    setBusy(badgeId); setMsg('');
    try {
      await api.post(`/badges/admin/${has ? 'revoke' : 'award'}`, { userId: user.id, badgeId });
      setOwned((prev) => { const n = new Set(prev); has ? n.delete(badgeId) : n.add(badgeId); return n; });
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(''); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90vh] space-y-3 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Huy hiệu của @{user.username}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600">✕</button>
        </div>
        <p className="text-xs text-ink-500">Bấm để gắn/gỡ huy hiệu. (Chỉ hiện huy hiệu thủ công; huy hiệu tự động theo mốc hoạt động được hệ thống tự cấp.)</p>
        {msg && <p className="text-sm text-rose-500">{msg}</p>}
        {catalog.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">Chưa có huy hiệu nào trong kho. Tạo ở <a href="/admin/badges" className="text-brand-600">Quản lý huy hiệu</a>.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((b) => {
              const has = owned.has(b.id);
              return (
                <button key={b.id} disabled={busy === b.id} onClick={() => toggle(b.id, has)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${has ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'border-ink-200/70 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50'}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg" style={{ backgroundColor: (b.color || '#888') + '22' }}>{/^https?:/.test(b.icon) ? <img src={b.icon} alt="" className="h-6 w-6 object-contain" /> : b.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{b.name}</span>
                    {b.description && <span className="block truncate text-[11px] text-ink-400">{b.description}</span>}
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${has ? 'text-emerald-600' : 'text-ink-400'}`}>{busy === b.id ? '…' : has ? 'Đã gắn ✓' : 'Gắn'}</span>
                </button>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="btn-outline w-full !py-1.5 text-sm">Đóng</button>
      </div>
    </div>
  );
}
