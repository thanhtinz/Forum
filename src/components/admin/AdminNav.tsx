import { ShieldAlert } from 'lucide-react';
import { AdminNavItems } from './AdminNavItems';

/** Sidebar quản trị cho màn hình lớn (PC). */
export function AdminNav() {
  return (
    <nav className="card p-1.5 lg:sticky lg:top-[4.5rem]">
      <div className="mb-1 flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-brand-600"><ShieldAlert size={16} /> Quản trị</div>
      <AdminNavItems />
    </nav>
  );
}
