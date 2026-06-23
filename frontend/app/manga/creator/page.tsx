'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, Btn, Empty, Notice } from '@/components/admin/ui';

interface Series {
  id: string;
  title: string;
  coverUrl?: string | null;
  publishStatus?: string | null;
  language?: string | null;
  ageRating: number;
  updatedAt: string;
  _count: { chapterList: number };
}

const PUBLISH_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
  PENDING: { label: 'Đang duyệt', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  PUBLISHED: { label: 'Đã xuất bản', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  REJECTED: { label: 'Bị từ chối', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
};

export default function CreatorDashboard() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<Series[]>([]);
  const [err, setErr] = useState('');
  const [delId, setDelId] = useState('');

  function load() {
    api.get<Series[]>('/creator/manga').then(setList).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); }, []);

  async function del(s: Series) {
    if (!confirm(`Xoá series "${s.title}"? Không thể hoàn tác.`)) return;
    setDelId(s.id); setErr('');
    try { await api.del(`/creator/manga/${s.id}`); load(); }
    catch (e: any) { setErr(e.message); } finally { setDelId(''); }
  }

  if (loading) return <div className="p-10 text-center text-ink-400">Đang tải...</div>;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={<BookOpen size={20} />}
        title="Tác phẩm của tôi"
        desc="Quản lý truyện bạn đã tạo và đăng tải"
        actions={
          <Link href="/manga/creator/new">
            <Btn><Plus size={14} /> Tạo mới</Btn>
          </Link>
        }
      />

      {err && <Notice kind="error">{err}</Notice>}

      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<BookOpen size={40} />}
            title="Chưa có tác phẩm nào"
            desc="Nhấn 'Tạo mới' để bắt đầu đăng truyện của bạn."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s) => {
            const st = PUBLISH_LABELS[s.publishStatus ?? 'DRAFT'] ?? PUBLISH_LABELS.DRAFT;
            return (
              <Card key={s.id} pad={false} className="overflow-hidden">
                <div className="flex gap-3 p-4">
                  {s.coverUrl ? (
                    <img src={s.coverUrl} alt="" className="h-24 w-16 flex-none rounded object-cover" />
                  ) : (
                    <div className="grid h-24 w-16 flex-none place-items-center rounded bg-ink-100 text-ink-300 dark:bg-ink-800">
                      <BookOpen size={24} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-tight line-clamp-2">{s.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">{s._count.chapterList} chương</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Link href={`/manga/creator/edit?id=${s.id}`}>
                        <Btn size="sm" variant="outline"><Edit2 size={12} /> Quản lý</Btn>
                      </Link>
                      <Btn size="sm" variant="danger" onClick={() => del(s)} disabled={delId === s.id}>
                        <Trash2 size={12} /> Xoá
                      </Btn>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
