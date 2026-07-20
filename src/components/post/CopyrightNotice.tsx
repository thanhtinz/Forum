import { ShieldCheck } from 'lucide-react';

/** Tuyên bố bản quyền hiển thị ngay trên khung mua hàng của mỗi bài. */
export function CopyrightNotice({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <aside className="mt-6 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
      <h4 className="flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
        <ShieldCheck size={16} /> Tuyên bố bản quyền
      </h4>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-amber-800/90 dark:text-amber-200/80">
        {lines.map((l, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-500">•</span><span>{l}</span></li>)}
      </ul>
    </aside>
  );
}
