import Link from 'next/link';
import type { Metadata } from 'next';
import { Cpu, Gamepad2 } from 'lucide-react';
import { db } from '@/lib/db';
import { clusterStats } from '@/lib/emulator';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản trị', robots: { index: false } };

export default async function AdminHomePage() {
  const [games, published, profiles, cluster, reports] = await Promise.all([
    db.game.count(),
    db.game.count({ where: { status: 'PUBLISHED' } }),
    db.emulatorProfile.count({ where: { active: true } }),
    clusterStats(),
    db.report.count({ where: { gameId: { not: null }, status: 'OPEN' } }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="zib-title text-xl">Tổng quan</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Game" value={fmtCount(games)} sub={`${published} đã đăng`} />
        <Tile label="Emulator profile" value={fmtCount(profiles)} sub="đang bật" />
        <Tile label="Phiên đang chạy" value={fmtCount(cluster.running)} sub={`${cluster.live}/${cluster.capacity} slot`} />
        <Tile label="Đang xếp hàng" value={fmtCount(cluster.queued)} />
        <Tile label="Lỗi 5 phút" value={fmtCount(cluster.errors5m)} sub={cluster.breakerOpen ? 'breaker MỞ' : 'ổn định'} />
        <Tile label="Báo lỗi game" value={fmtCount(reports)} sub="chờ xử lý" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/games" className="post-card p-5">
          <Gamepad2 size={22} className="text-brand-500" />
          <b className="mt-2 block">Quản lý game</b>
          <p className="text-sm text-ink-500">CRUD game, version, file JAR/JAD, ảnh, ma trận tương thích.</p>
        </Link>
        <Link href="/admin/emulator" className="post-card p-5">
          <Cpu size={22} className="text-brand-500" />
          <b className="mt-2 block">Quản lý emulator</b>
          <p className="text-sm text-ink-500">Profile thiết bị, hạn mức tài nguyên, phiên đang chạy, log lỗi.</p>
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] text-ink-500">{label}</p>
      {sub && <p className="text-[10px] text-ink-400">{sub}</p>}
    </div>
  );
}
