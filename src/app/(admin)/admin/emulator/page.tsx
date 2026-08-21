import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Activity, AlertTriangle, Cpu, Plus, Power, Square } from 'lucide-react';
import { db } from '@/lib/db';
import { clusterStats, LIVE_STATUSES } from '@/lib/emulator';
import { SESSION_STATUS_LABEL } from '@/lib/game';
import { fmtCount } from '@/lib/utils';
import { killSession, toggleProfileActive } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản lý emulator', robots: { index: false } };

export default async function AdminEmulatorPage() {
  const [profiles, cluster, sessions, errors] = await Promise.all([
    db.emulatorProfile.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { sessions: true, gameProfiles: true } } },
    }),
    clusterStats(),
    db.emulatorSession.findMany({
      where: { status: { in: LIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        game: { select: { title: true, slug: true } },
        profile: { select: { name: true } },
        user: { select: { username: true, name: true } },
      },
    }),
    db.emulatorSession.findMany({
      where: { status: 'ERROR' },
      orderBy: { endedAt: 'desc' },
      take: 15,
      include: { game: { select: { title: true } }, profile: { select: { name: true } } },
    }),
  ]);

  const profileNames = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="zib-title text-xl">Quản lý emulator</h1>
        <Link href="/admin/emulator/new" className="btn-primary !py-1.5 text-sm"><Plus size={15} /> Thêm profile</Link>
      </div>

      {/* Sức khoẻ cụm */}
      <section className="card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Activity size={16} /> Sức khoẻ cụm</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="Phiên sống" value={`${cluster.live}/${cluster.capacity}`} />
          <Tile label="Đang chơi" value={fmtCount(cluster.running)} />
          <Tile label="Xếp hàng" value={fmtCount(cluster.queued)} />
          <Tile label="Lỗi 5 phút" value={fmtCount(cluster.errors5m)} />
          <Tile label="Circuit breaker" value={cluster.breakerOpen ? 'MỞ' : 'Đóng'} danger={cluster.breakerOpen} />
        </div>
        {cluster.breakerOpen && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40">
            <AlertTriangle size={14} /> Quá nhiều lỗi runtime — hệ thống đang tạm từ chối phiên mới.
          </p>
        )}
        {cluster.byProfile.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Profile dùng nhiều (7 ngày)</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {cluster.byProfile.map((p) => (
                <span key={p.profileId} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  {profileNames.get(p.profileId) ?? p.profileId} · {p._count._all}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Profile */}
      <section className="card overflow-x-auto">
        <h2 className="flex items-center gap-2 p-4 pb-2 text-sm font-bold"><Cpu size={16} /> Emulator profile</h2>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
            <tr>
              <th className="p-3 font-bold">Profile</th>
              <th className="p-3 font-bold">Màn hình</th>
              <th className="p-3 font-bold">CLDC/MIDP</th>
              <th className="p-3 font-bold">Hạn mức</th>
              <th className="p-3 font-bold">Gắn với</th>
              <th className="p-3 font-bold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {profiles.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-ink-400">Chưa có profile nào.</td></tr>}
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <Link href={`/admin/emulator/${p.id}`} className="font-semibold hover:text-brand-600">{p.name}</Link>
                  <span className="block text-[11px] text-ink-400">
                    /{p.slug}{p.runtimeUrl ? '' : ' · chưa gắn runtime'}
                  </span>
                </td>
                <td className="p-3 text-ink-500">{p.screenWidth}×{p.screenHeight} · {p.orientation === 'PORTRAIT' ? 'dọc' : 'ngang'}</td>
                <td className="p-3 text-ink-500">{p.cldc} / {p.midp}</td>
                <td className="p-3 text-[11px] text-ink-400">
                  {p.cpuMillicores}m CPU · {p.ramLimitMb}MB · tối đa {p.maxConcurrent} phiên
                  <br />session {Math.round(p.sessionMaxSec / 60)}′ · idle {p.idleTimeoutSec}s
                </td>
                <td className="p-3 text-[11px] text-ink-400">{p._count.gameProfiles} game · {p._count.sessions} phiên</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <form action={async () => { 'use server'; await toggleProfileActive(p.id); }}>
                      <button type="submit" title={p.active ? 'Đang bật' : 'Đang tắt'}
                        className={`grid h-7 w-7 place-items-center rounded-lg ${p.active ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                        <Power size={13} />
                      </button>
                    </form>
                    <Link href={`/admin/emulator/${p.id}`} className="text-[11px] text-brand-600 hover:underline">Sửa</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Phiên đang chạy */}
      <section className="card overflow-x-auto">
        <h2 className="p-4 pb-2 text-sm font-bold">Phiên đang hoạt động ({sessions.length})</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
            <tr>
              <th className="p-3 font-bold">Game</th>
              <th className="p-3 font-bold">Người chơi</th>
              <th className="p-3 font-bold">Profile</th>
              <th className="p-3 font-bold">Trạng thái</th>
              <th className="p-3 font-bold">Bắt đầu</th>
              <th className="p-3 font-bold">Heartbeat</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {sessions.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-ink-400">Không có phiên nào đang chạy.</td></tr>}
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="p-3"><Link href={`/games/${s.game.slug}`} className="hover:text-brand-600">{s.game.title}</Link></td>
                <td className="p-3 text-ink-500">{s.user?.username ?? s.user?.name ?? 'Khách'}</td>
                <td className="p-3 text-ink-500">{s.profile.name}</td>
                <td className="p-3"><span className="chip bg-ink-100 !px-2 !py-0 text-[10px] dark:bg-ink-800">{SESSION_STATUS_LABEL[s.status]}</span></td>
                <td className="p-3 text-[11px] text-ink-400">{format(s.createdAt, 'HH:mm:ss dd/MM')}</td>
                <td className="p-3 text-[11px] text-ink-400">{s.lastHeartbeatAt ? format(s.lastHeartbeatAt, 'HH:mm:ss') : '—'}</td>
                <td className="p-3">
                  <form action={async () => { 'use server'; await killSession(s.id); }}>
                    <button type="submit" className="flex items-center gap-1 text-[11px] text-red-500 hover:underline">
                      <Square size={11} /> Đóng
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Log lỗi */}
      <section className="card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16} /> Log lỗi runtime</h2>
        {errors.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-400">Chưa ghi nhận lỗi runtime nào.</p>
        ) : (
          <ul className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
            {errors.map((e) => (
              <li key={e.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <b className="text-ink-600 dark:text-ink-200">{e.game.title}</b>
                  <span>{e.profile.name}</span>
                  <span>{e.endedAt ? format(e.endedAt, 'HH:mm dd/MM/yyyy') : '—'}</span>
                </div>
                <p className="mt-0.5 break-words text-xs text-red-500">{e.error ?? 'Không có mô tả lỗi.'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${danger ? 'bg-red-50 dark:bg-red-950/40' : 'bg-ink-50 dark:bg-ink-800/60'}`}>
      <p className={`text-lg font-black ${danger ? 'text-red-600' : ''}`}>{value}</p>
      <p className="text-[11px] text-ink-500">{label}</p>
    </div>
  );
}
