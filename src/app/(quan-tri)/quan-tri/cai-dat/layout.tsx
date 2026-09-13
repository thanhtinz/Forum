import type { Metadata } from 'next';
import { TabCaiDat } from '@/components/quan-tri/TabCaiDat';

export const metadata: Metadata = { title: 'Cài đặt' };

/*
 * KHUNG CHUNG CỦA KHU CÀI ĐẶT — đầu đề và hàng tab ở đây, không lặp ở ba trang.
 *
 * Ba nhóm cấu hình tách thành ba TRANG chứ không gộp một trang ba khối: mỗi
 * nhóm là một biểu mẫu riêng có nút Lưu riêng, mà ba biểu mẫu dài xếp chồng
 * nhau thì người sửa cứ phải cuộn đi cuộn lại để tìm đúng nút của mình. Tách
 * trang cũng đồng nghĩa mỗi nhóm có một địa chỉ riêng để dán cho nhau.
 */
export default function KhungCaiDat({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="tieu-de-trang">Cài đặt</h1>
        <p className="phu mt-1">
          Sửa ở đây có hiệu lực ngay, không cần dựng lại trang.
        </p>
      </div>

      <TabCaiDat />

      {children}
    </div>
  );
}
