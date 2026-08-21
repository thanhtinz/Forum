import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { EMPTY_PROFILE, ProfileForm } from '@/components/admin/ProfileForm';

export const metadata: Metadata = { title: 'Thêm emulator profile', robots: { index: false } };

export default function NewProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin/emulator" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Danh sách profile
      </Link>
      <div className="card p-5">
        <h1 className="zib-title mb-4">Thêm emulator profile</h1>
        <ProfileForm value={EMPTY_PROFILE} />
      </div>
    </div>
  );
}
