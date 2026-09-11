import { Vet, XuongDanhSach } from '@/components/KhungXuong';

/** Khung xương trang danh sách. Vì sao chỉ đặt ở đây: xem `duyet/loading.tsx`. */
export default function DangTai() {
  return (
    <div className="space-y-5" role="status" aria-label="Đang tải">
      <div className="space-y-2">
        <Vet className="h-8 w-48" />
        <Vet className="h-3 w-64" />
      </div>
      <XuongDanhSach so={8} />
    </div>
  );
}
