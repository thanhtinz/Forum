import { Vet, XuongDanhSach } from '@/components/KhungXuong';

/*
 * KHUNG XƯƠNG CHỈ ĐẶT Ở TRANG DANH SÁCH, KHÔNG ĐẶT Ở GỐC.
 *
 * Bản trước đặt một tệp `loading.tsx` ở gốc nhóm cho mọi trang cùng hưởng. Cái
 * giá phải trả chỉ lộ ra khi bộ kiểm chạy: `loading.tsx` biến trang thành phản
 * hồi PHÁT DẦN, mà phát dần thì mã trạng thái bị chốt là 200 ngay lúc đẩy phần
 * vỏ ra — trước khi trang kịp chạy tới chỗ gọi `notFound()`. Kết quả là mọi
 * đường dẫn game không tồn tại đều trả 200 kèm nội dung "không tìm thấy", tức
 * là soft-404: máy tìm kiếm coi đó là một trang thật và lập chỉ mục nó.
 *
 * Nên khung xương chỉ đặt ở những trang KHÔNG BAO GIỜ gọi `notFound()` hay
 * `redirect()`, và không có tuyến con nào gọi hai thứ ấy — vì `loading.tsx`
 * bao trùm cả những tuyến nằm dưới nó. Đó là vì sao `/game` KHÔNG có tệp này
 * dù nó cũng là trang danh sách: `/game/[duongDan]` nằm ngay dưới, và mọi
 * đường dẫn game sai sẽ trả 200 theo.
 *
 * Còn lại đúng ba trang: `/duyet`, `/bxh`, `/tim`. Trang game, trang nhà phát
 * triển, mấy trang cần đăng nhập thì thà chờ thêm một nhịp còn hơn trả sai mã.
 */
export default function DangTai() {
  return (
    <div className="lg:flex lg:gap-8" role="status" aria-label="Đang tải">
      <div className="hidden w-[212px] shrink-0 space-y-2 lg:block">
        {Array.from({ length: 8 }, (_, i) => <Vet key={i} className="h-7 w-full" />)}
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <Vet className="h-8 w-52" />
        <XuongDanhSach so={8} />
      </div>
    </div>
  );
}
