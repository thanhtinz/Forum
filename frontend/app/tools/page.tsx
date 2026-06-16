'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface ToolCat {
  slug: string; name: string; description: string; icon: string;
  tools: { slug: string; name: string; description: string; isPro: boolean; usageCount: number }[];
}

export default function ToolsPage() {
  const { data, isLoading } = useSWR<ToolCat[]>('/tools', fetcher);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Bộ công cụ</h1>
        <p className="text-ink-500">Tổng hợp công cụ cho lập trình viên — format, mã hoá, tạo dữ liệu, chuyển đổi…</p>
      </header>

      {isLoading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}

      <div className="space-y-6">
        {data?.map((cat) => (
          <section key={cat.slug}>
            <h2 className="mb-3 text-lg font-semibold">{cat.name}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.tools.map((t) => (
                <a key={t.slug} href={`/tools/${t.slug}`}
                  className="card group p-4 transition-shadow hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold group-hover:text-brand-600">{t.name}</h3>
                    {t.isPro && <span className="chip bg-amber-100 text-amber-700">PRO</span>}
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{t.description}</p>
                  <p className="mt-2 text-xs text-ink-400">{t.usageCount} lượt dùng</p>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
