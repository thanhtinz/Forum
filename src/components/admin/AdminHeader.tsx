import Link from 'next/link';
import { ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { AdminMobileNav } from './AdminMobileNav';

export interface AdminHeaderUser {
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản trị viên', MODERATOR: 'Điều hành viên' };

export function AdminHeader({ user }: { user: AdminHeaderUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950 text-white">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4">
        <AdminMobileNav />
        <Link href="/admin" className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-white"><ShieldCheck size={18} /></span>
          <span className="whitespace-nowrap text-base font-black tracking-tight">Nova <span className="text-brand-400">Quản trị</span></span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/" className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-white sm:flex">
            <ExternalLink size={15} /> Xem trang
          </Link>
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-300 hover:bg-ink-800 sm:hidden">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-ink-800/70 p-1 sm:pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.image
              ? <img src={user.image} alt="" className="size-7 rounded-full object-cover" />
              : <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{(user.name ?? user.username ?? 'A')[0]?.toUpperCase()}</span>}
            <div className="hidden leading-tight sm:block">
              <div className="text-xs font-semibold">{user.name ?? user.username}</div>
              <div className="text-[10px] text-brand-300">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
