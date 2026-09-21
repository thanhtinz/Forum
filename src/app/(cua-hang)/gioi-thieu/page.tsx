import Link from 'next/link';
import type { Metadata } from 'next';
import { docTrang } from '@/lib/cai-dat';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { gonSo } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Giới thiệu' };

/*
 * TRANG GIỚI THIỆU.
 *
 * Viết theo đúng thứ cửa hàng LÀM ĐƯỢC, không hứa gì thêm. Mấy con số ở đây
 * đọc thẳng từ cơ sở dữ liệu chứ không gõ tay: một trang giới thiệu chép cứng
 * "hơn 500 game" rồi để đó vài tháng là một lời nói dối có hạn sử dụng.
 */
export default async function GioiThieu() {
  const [trang, soGame, soTheLoai] = await Promise.all([
    docTrang(),
    db.game.count({ where: DANG_HIEN }),
    db.theLoai.count(),
  ]);

  return (
    <div className="cot space-y-7">
      <header>
        <h1 className="tieu-de-trang">Giới thiệu</h1>
        <p className="phu mt-1">{trang.ten} là gì, và làm được những gì.</p>
      </header>

      <section className="the space-y-3 p-5 text-[15px] leading-relaxed">
        <p>
          {trang.ten} là một cửa hàng tải game cho máy Java ME, Android, iOS, macOS và
          Windows. Hiện có <strong>{gonSo(soGame)} game</strong> đang bày, chia theo{' '}
          <strong>{soTheLoai} thể loại</strong>.
        </p>
        <p>
          Mỗi game có trang riêng: bản tải theo từng hệ máy, ảnh chụp màn hình,
          ghi chú của từng bản, điểm đánh giá của người chơi, và một khu diễn đàn
          nằm ngay trong trang game ấy — hỏi gì về game nào thì hỏi ngay ở đó.
        </p>
        <p>
          Tải game <strong>không mất tiền và không cần tài khoản</strong>. Tài khoản chỉ
          cần khi bạn muốn nói gì: chấm sao, viết đánh giá, mở chủ đề, hay lưu lại
          game để tải sau.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="tieu-de">Game ở đây từ đâu ra</h2>
        <div className="the space-y-3 p-5 text-[15px] leading-relaxed">
          <p>
            Một phần do ban quản trị tự bày lên kệ. Phần còn lại do chính người làm
            ra game gửi tới: họ mở một tài khoản tác giả, nhập game, gắn bản tải rồi
            gửi duyệt — và không bản nào lên kệ trước khi có người xem qua.
          </p>
          <p>
            Không tìm thấy game bạn cần thì{' '}
            <Link href="/yeu-cau" className="font-semibold text-nhan hover:underline">
              gửi một yêu cầu
            </Link>
            . Còn nếu bạn làm ra game và muốn tự bày nó ở đây,{' '}
            <Link href="/tac-gia/dang-ky" className="font-semibold text-nhan hover:underline">
              xin làm tác giả
            </Link>{' '}
            là bước đầu tiên.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="tieu-de">Mấy điều nói trước</h2>
        <div className="the space-y-3 p-5 text-[15px] leading-relaxed">
          {/*
            Nói thẳng mấy giới hạn thật, không giấu. Người tải tệp thực thi về
            máy mình có quyền biết họ đang tin vào cái gì.
          */}
          <p>
            Phần lớn game ở đây là game cũ, nhiều cái ra đời từ thời máy Nokia.
            Cửa hàng giữ chúng lại vì chẳng còn chỗ nào giữ nữa, chứ không phải vì
            có quan hệ gì với hãng làm ra chúng.
          </p>
          <p>
            Thấy một game không nên có mặt ở đây — sai bản quyền, lẫn phần mềm độc
            hại, hay tệp hỏng —{' '}
            <Link href="/lien-he" className="font-semibold text-nhan hover:underline">
              báo cho ban quản trị
            </Link>
            . Luật chơi đầy đủ nằm ở trang{' '}
            <Link href="/dieu-khoan" className="font-semibold text-nhan hover:underline">
              Điều khoản
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
