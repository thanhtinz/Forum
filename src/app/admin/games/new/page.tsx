import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { NewGameForm } from '@/components/admin/NewGameForm';
import { requireSuperAdmin } from '@/lib/admin';

export const metadata: Metadata = { title: 'Thêm game', robots: { index: false } };

export default async function NewGamePage() {
  // Kho game là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await requireSuperAdmin();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/admin/games" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Danh sách game
      </Link>
      <div className="card p-5">
        <h1 className="zib-title mb-4">Thêm game mới</h1>
        <p className="mb-4 text-sm text-ink-500">
          Nhập tên game để tạo bản nháp, các thông tin còn lại (version, file, ảnh, tương thích) sẽ khai báo ở trang sửa.
        </p>
        <NewGameForm />
      </div>
    </div>
  );
}
