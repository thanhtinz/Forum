/**
 * Hàng tiêu đề dùng chung cho mọi bảng ở khu diễn đàn.
 * Bề rộng cột phải khớp với BoardList/ThreadRow: w-40 · w-16 · w-20.
 */
export function TableHead({ title, icon, action, cols }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  cols?: { last?: string; a?: string; b?: string };
}) {
  return (
    <header className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-3 py-2.5 sm:px-4 dark:border-ink-800 dark:bg-ink-900/60">
      {icon}
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide text-ink-700 dark:text-ink-200">{title}</h2>
      {action}
      {cols && (
        <>
          <span className="hidden w-40 text-xs font-semibold uppercase tracking-wide text-ink-400 lg:block">{cols.last ?? ''}</span>
          <span className="hidden w-16 text-center text-xs font-semibold uppercase tracking-wide text-ink-400 sm:block">{cols.a ?? ''}</span>
          <span className="hidden w-20 text-center text-xs font-semibold uppercase tracking-wide text-ink-400 md:block">{cols.b ?? ''}</span>
        </>
      )}
    </header>
  );
}
