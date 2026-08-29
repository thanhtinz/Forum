import Link from 'next/link';

export interface SlideXem {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
}

/**
 * Dải slide đầu trang chủ.
 *
 * Không có JavaScript nào: cuộn ngang là của trình duyệt, `snap` giữ cho mỗi
 * lần vuốt dừng gọn vào một tấm. Nhờ vậy đây vẫn là server component, không tốn
 * thêm mã gửi xuống máy người xem, và cuộn bằng bàn phím hay vuốt trên điện
 * thoại đều chạy sẵn.
 *
 * Cố ý KHÔNG tự chạy vòng: slide tự trôi thì người đang đọc dở một tấm bị kéo
 * sang tấm khác, mà người dùng bàn phím hay trình đọc màn hình còn khổ hơn nữa.
 *
 * Lớp cuộn lấy đúng của `GameRow` (`src/components/game/GameRow.tsx`) để cả
 * trang chỉ có một kiểu dải cuộn ngang.
 */
export function DaiSlide({ slides }: { slides: SlideXem[] }) {
  if (slides.length === 0) return null;
  const motTam = slides.length === 1;

  return (
    <section aria-label="Giới thiệu" className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
      {slides.map((s) => {
        const than = (
          <>
            {/* Ảnh nền. `alt` để rỗng vì tiêu đề đã nằm ngay bên cạnh dưới dạng
                chữ thật — đọc lại lần nữa là thừa với trình đọc màn hình. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt="" aria-hidden loading="lazy"
              className="absolute inset-0 size-full object-cover" />
            {/* Lớp phủ tối dần từ trái: chữ trắng đặt thẳng lên ảnh thì gặp ảnh
                sáng là mất hút, mà ảnh do quản trị tự tải lên nên không đoán
                trước được nó sáng hay tối. */}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <span className="relative flex h-full flex-col justify-end p-4 sm:p-5">
              <b className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow sm:text-xl">
                {s.title}
              </b>
              {s.subtitle && (
                <span className="mt-1 line-clamp-2 text-sm text-white/85 drop-shadow">{s.subtitle}</span>
              )}
            </span>
          </>
        );

        /*
         * Bề ngang cố ý để hụt một chút khi có nhiều hơn một tấm, cho tấm sau
         * ló ra ở mép phải — đó là thứ duy nhất báo cho người xem biết còn cuộn
         * được nữa. Trải hết khổ thì trên máy tính tấm thứ hai coi như không
         * tồn tại, vì ở đây không có nút mũi tên hay chấm tròn nào.
         *
         * Chỉ một tấm thì trải hết khổ, vì chẳng còn gì để ló.
         */
        const lop = motTam
          ? 'relative h-40 w-full shrink-0 snap-start overflow-hidden rounded-2xl bg-ink-100 sm:h-48 dark:bg-ink-800'
          : 'relative h-40 w-[88%] shrink-0 snap-start overflow-hidden rounded-2xl bg-ink-100 sm:h-48 sm:w-[70%] lg:w-[92%] dark:bg-ink-800';

        return s.link ? (
          <Link key={s.id} href={s.link} className={`${lop} transition-transform hover:-translate-y-0.5`}>
            {than}
          </Link>
        ) : (
          <div key={s.id} className={lop}>{than}</div>
        );
      })}
    </section>
  );
}
