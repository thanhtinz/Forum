import Link from 'next/link';

/**
 * CHÂN TRANG CỦA CỔNG NHÀ PHÁT TRIỂN.
 *
 * Cửa hàng không có chân trang — ở đó thanh tab đáy đã chiếm chỗ ấy và người
 * mua hàng cuộn mãi không hết danh sách game nên chẳng bao giờ chạm tới đáy.
 * Cổng này thì ngược lại: mỗi trang là một trang có đáy thật, và người bán
 * hàng cần biết luật bày game ở đâu, hỏi ban quản trị bằng đường nào.
 *
 * Các mục dẫn về cửa hàng đều để đường dẫn THƯỜNG, để phần mềm trung gian tự
 * đưa qua đúng tên miền cửa hàng.
 */
export function ChanTrangTacGia({ laTacGia = false }: {
  /** Người đang xem đã là tác giả chưa. Chưa thì bảng việc chỉ có lối đăng ký. */
  laTacGia?: boolean;
}) {
  const nam = new Date().getFullYear();

  return (
    <footer className="vach mt-10">
      <div className="khung grid gap-6 py-8 text-[13px] sm:grid-cols-3">
        <div>
          <p className="mb-2 font-bold tracking-tight">
            SunnyStore <span className="font-medium text-mo">cho nhà phát triển</span>
          </p>
          <p className="text-mo">
            Bày game của bạn ra cửa hàng, theo dõi lượt tải và trả lời người chơi
            ngay trong khu diễn đàn của từng game.
          </p>
        </div>

        <nav aria-label="Việc của tác giả">
          <p className="mb-2 font-semibold">Việc của tác giả</p>
          {/* Người chưa được duyệt mà bày ra "Game của tôi" thì bấm vào chỉ
              bị đẩy ngược về trang đăng ký — một cánh cửa khoá bày giữa nhà. */}
          <ul className="space-y-1.5 text-mo">
            {laTacGia ? (
              <>
                <li><Link href="/quan-ly" className="hover:text-chu">Tổng quan</Link></li>
                <li><Link href="/quan-ly/game" className="hover:text-chu">Game của tôi</Link></li>
                <li><Link href="/quan-ly/game/moi" className="hover:text-chu">Bày game mới</Link></li>
                <li><Link href="/quan-ly/ho-so" className="hover:text-chu">Hồ sơ tác giả</Link></li>
              </>
            ) : (
              <li><Link href="/tac-gia/dang-ky" className="hover:text-chu">Đăng ký làm tác giả</Link></li>
            )}
          </ul>
        </nav>

        <nav aria-label="Cửa hàng">
          <p className="mb-2 font-semibold">Cửa hàng</p>
          <ul className="space-y-1.5 text-mo">
            <li><Link href="/" className="hover:text-chu">Trang đầu</Link></li>
            <li><Link href="/game" className="hover:text-chu">Duyệt game</Link></li>
            <li><Link href="/bxh" className="hover:text-chu">Bảng xếp hạng</Link></li>
            <li><Link href="/toi" className="hover:text-chu">Tài khoản của tôi</Link></li>
          </ul>
        </nav>
      </div>

      <p className="khung pb-8 text-[12px] text-mo">© {nam} SunnyStore</p>
    </footer>
  );
}
