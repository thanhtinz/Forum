import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Tải sao cho an toàn' };

/*
 * Trang này tồn tại vì cửa hàng game cũ là nơi phần mềm độc hại hay núp nhất: người
 * ta tải tệp lạ về máy, cài bằng tay, và bỏ qua mọi cảnh báo vì đang háo hức.
 * Nói trước bốn điều dưới đây rẻ hơn nhiều so với việc sửa hậu quả.
 */
const MUC = [
  {
    ten: 'Đối chiếu mã kiểm tra',
    chu: 'Mỗi tệp tải về đều in kèm một dãy mã sha256. Tải xong, tính lại mã của tệp trên máy bạn rồi so với dãy in ở trang game. Khác nhau nghĩa là tệp đã bị đổi trên đường truyền — xoá đi, đừng mở.',
  },
  {
    ten: 'Tệp JAR không xin quyền gì cả',
    chu: 'Game Java chạy trong một cái hộp kín của máy: nó không đọc được danh bạ, không đọc được tin nhắn. Nếu một tệp JAR đòi mấy thứ ấy thì nó không phải game.',
  },
  {
    ten: 'APK lạ thì xem kỹ phần quyền',
    chu: 'Android hỏi quyền trước khi cài. Một game xếp hình mà xin quyền đọc tin nhắn hoặc quyền gọi điện là dấu hiệu rõ ràng. Bấm huỷ, rồi báo cho SunnyStore.',
  },
  {
    ten: 'iPhone thì chỉ cài qua App Store',
    chu: 'iPhone chưa bẻ khoá không cài được tệp IPA tải từ web — Apple chỉ mở App Store, TestFlight, hệ quản lý thiết bị của doanh nghiệp, và chợ ứng dụng thay thế ở châu Âu. Trang nào hứa cài IPA cho bạn chỉ bằng một cú bấm thì trang ấy đang nói dối.',
  },
];

export default function TrangAnToan() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="tieu-de-trang">Tải sao cho an toàn</h1>
        <p className="phu mt-1">Bốn điều nên biết trước khi cài bất cứ thứ gì lấy từ mạng về.</p>
      </div>

      <ul className="space-y-3">
        {MUC.map((m) => (
          <li key={m.ten} className="the flex gap-3 p-4">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nhan" />
            <div>
              <h2 className="text-[14px] font-bold">{m.ten}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-mo">{m.chu}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
