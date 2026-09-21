import Link from 'next/link';
import type { Metadata } from 'next';
import { docTrang } from '@/lib/cai-dat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Điều khoản' };

/*
 * ĐIỀU KHOẢN.
 *
 * Chỉ viết ra những luật CỬA HÀNG NÀY THẬT SỰ THI HÀNH, và mỗi luật đều có mã
 * đứng sau nó: gỡ bài, khoá tài khoản, duyệt game trước khi lên kệ, chặn nhịp
 * đăng bài. Một trang điều khoản chép từ chỗ khác về, nói những điều không ai
 * thi hành, thì tệ hơn là không có — nó dạy người đọc rằng chữ ở đây không
 * đáng tin.
 *
 * Và KHÔNG bịa ra pháp nhân: không tên công ty, không địa chỉ, không mã số
 * thuế. Cửa hàng này chưa khai những thứ ấy ở đâu cả, nên viết ra là nói dối.
 */

function Muc({ de, children }: { de: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="tieu-de">{de}</h2>
      <div className="the space-y-3 p-5 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function DieuKhoan() {
  const trang = await docTrang();

  return (
    <div className="cot space-y-7">
      <header>
        <h1 className="tieu-de-trang">Điều khoản</h1>
        <p className="phu mt-1">
          Luật chơi ở {trang.ten}. Ngắn, và chỉ gồm những điều thật sự được thi hành.
        </p>
      </header>

      <Muc de="Tải game">
        <p>
          Tải không mất tiền và không cần tài khoản. Cửa hàng không thu phí ở bất kỳ
          bước nào, và không có bước nào đòi số thẻ.
        </p>
        <p>
          Game ở đây phần lớn đã cũ. Cửa hàng không hứa chúng chạy được trên máy của
          bạn, và không chịu trách nhiệm về thiệt hại phát sinh khi bạn chạy chúng —
          mỗi trang game đều ghi rõ hệ máy và bản mới nhất để bạn tự cân nhắc trước.
        </p>
      </Muc>

      <Muc de="Tài khoản">
        <p>
          Một người một tài khoản. Tài khoản dùng để chấm sao, viết đánh giá, mở chủ
          đề và lưu game — không có tài khoản thì vẫn tải được bình thường.
        </p>
        <p>
          Ban quản trị <strong>khoá tài khoản</strong> khi có người rải bài, quấy rối,
          hay cố tình phá. Khoá là chặn ở mọi lối viết, không phải xoá; bài đã viết
          thì gỡ riêng.
        </p>
      </Muc>

      <Muc de="Bài viết và đánh giá">
        <p>
          Bạn giữ quyền với thứ mình viết, và cho phép cửa hàng bày nó ra trong trang
          game tương ứng. Sửa hay xoá bài của mình thì tự làm được.
        </p>
        <p>
          Mỗi bài viết và mỗi bài đánh giá đều có nút báo xấu. Bài bị báo sẽ có người
          đọc lại, và <strong>gỡ nếu đúng là vi phạm</strong>: quảng cáo, chửi bới,
          nội dung không hợp lứa tuổi, hay đường dẫn dẫn đi chỗ khác.
        </p>
        <p>
          Có <strong>nhịp nghỉ giữa hai lần đăng</strong> — vài giây với lời đáp, lâu
          hơn với chủ đề mới. Nó chặn máy rải bài, không nhắm vào người viết thật.
        </p>
      </Muc>

      <Muc de="Bày game lên kệ">
        <p>
          Tác giả gửi game thì <strong>game nằm ở nháp cho tới khi được duyệt</strong>.
          Không bản tải nào lên kệ mà chưa qua tay người xem.
        </p>
        <p>
          Gửi lên đây nghĩa là bạn xác nhận mình có quyền phát hành tệp ấy. Cửa hàng
          gỡ game khi nhận được khiếu nại bản quyền có căn cứ, và không đòi bên khiếu
          nại chứng minh gì quá mức cần thiết.
        </p>
      </Muc>

      <Muc de="Dữ liệu của bạn">
        <p>
          Cửa hàng giữ đúng thứ cần để chạy: tài khoản, bài viết, đánh giá, và sổ
          game bạn đã tải. Lối{' '}
          <Link href="/toi/cai-dat" className="font-semibold text-nhan hover:underline">
            Cài đặt tài khoản
          </Link>{' '}
          cho bạn sửa hồ sơ, tắt thư báo, và xoá hẳn tài khoản.
        </p>
      </Muc>

      <Muc de="Khi điều khoản đổi">
        <p>
          Trang này đổi thì đổi ngay tại đây, không có bản lưu nào khác. Cửa hàng
          không gửi thư báo mỗi lần sửa một câu chữ — nên nếu bạn cần chắc, hãy đọc
          lại trang này.
        </p>
        <p>
          Chưa rõ chỗ nào thì{' '}
          <Link href="/lien-he" className="font-semibold text-nhan hover:underline">
            hỏi ban quản trị
          </Link>
          .
        </p>
      </Muc>
    </div>
  );
}
