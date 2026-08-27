/**
 * Hàng tiêu đề dùng chung cho mọi bảng ở khu diễn đàn.
 * Bề rộng cột phải khớp với BoardList/ThreadRow: w-40 · w-16 · w-20.
 *
 * Nền dùng lớp `.retro-head`: thanh nổi khối, viền vát sáng-trên tối-dưới —
 * đúng kiểu `.phdr` của JohnCMS, mã nguồn dựng nên phần lớn forum wap Việt
 * quãng 2010. Chỉ là lớp áo, bố cục vẫn giữ nguyên.
 */
export function TableHead({ title, icon, action, cols }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  cols?: { last?: string; a?: string; b?: string };
}) {
  return (
    <header className="retro-head flex items-center gap-3 px-3 py-2.5 sm:px-4">
      {icon}
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide">{title}</h2>
      {action}
      {cols && (
        <>
          <span className="retro-sub hidden w-40 font-semibold uppercase tracking-wide opacity-60 lg:block">{cols.last ?? ''}</span>
          <span className="retro-sub hidden w-16 text-center font-semibold uppercase tracking-wide opacity-60 sm:block">{cols.a ?? ''}</span>
          <span className="retro-sub hidden w-20 text-center font-semibold uppercase tracking-wide opacity-60 md:block">{cols.b ?? ''}</span>
        </>
      )}
    </header>
  );
}
