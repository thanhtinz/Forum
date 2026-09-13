import type { Metadata } from 'next';
import { docKho, nguonCua } from '@/lib/cai-dat';
import { caiDatKho } from '@/lib/kho';
import { BieuMauCaiDat } from '@/components/quan-tri/BieuMauCaiDat';
import { luuKho } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kho tệp · Cài đặt' };

/*
 * CHỖ CẤT ẢNH, PHIM VÀ TỆP GAME (Cloudflare R2).
 *
 * Khai đủ năm ô thì tệp bay thẳng lên R2; thiếu một ô là cửa hàng lùi về cất
 * ngay trên đĩa máy chủ. Lùi được như thế nên máy vừa dựng lên đã chạy được,
 * nhưng đĩa máy chủ thì không sống qua một lượt triển khai mới — vậy nên trang
 * này phải nói rõ đang ở lối nào.
 */
export default async function CaiDatKho() {
  const k = await docKho();
  const dang = await caiDatKho();

  return (
    <BieuMauCaiDat
      hanh={luuKho}
      nguon={await nguonCua('kho')}
      chu="Lưu cấu hình kho tệp"
      them={<LoiNhac dang={dang} />}
      o={[
        {
          ten: 'taiKhoan', nhan: 'Mã tài khoản Cloudflare', hep: true, banDau: k.taiKhoan,
          yNghia: 'Thiếu bất kỳ ô nào thì tệp cất ngay trên đĩa máy chủ.',
        },
        { ten: 'thung', nhan: 'Tên thùng', hep: true, banDau: k.thung, goiY: 'sunnystore' },
        { ten: 'khoa', nhan: 'Mã khoá truy cập', hep: true, banDau: k.khoa },
        {
          ten: 'diaChi', nhan: 'Địa chỉ công khai của thùng', hep: true, banDau: k.diaChi,
          goiY: 'https://tep.sunnystore.vn',
          yNghia: 'Đường dẫn khách tải tệp về. Gạch chéo cuối dòng tự bỏ đi.',
        },
        {
          ten: 'biMat', nhan: 'Khoá bí mật', kieu: 'biMat', daCo: !!k.biMat,
          yNghia: 'Cloudflare chỉ cho xem khoá này đúng một lần lúc tạo.',
        },
      ]} />
  );
}

/**
 * Một dòng nói thẳng tệp đang rơi xuống đâu.
 *
 * Bảng ô nhập ở trên chỉ nói cấu hình TỚI TỪ ĐÂU, không nói nó có ĐỦ hay
 * không — mà thiếu một ô trong năm là cả kho lặng lẽ lùi về ghi lên đĩa máy
 * chủ. Trên máy chủ chỉ đọc thì mọi lượt tải tệp lên hỏng, còn trên máy chủ
 * thường thì tệp sống tới lượt triển khai sau là mất. Cả hai đều là loại hỏng
 * không ai thấy cho tới khi có người mất ảnh, nên phải nói ngay ở đây.
 */
function LoiNhac({ dang }: { dang: { loai: 'r2' | 'dia'; thieu: string[] } }) {
  if (dang.loai === 'r2') {
    return (
      <p className="rounded-nut bg-nhan/10 px-3 py-2 text-[13px] font-medium text-nhan">
        Đủ cấu hình — tệp đang bay thẳng lên R2.
      </p>
    );
  }
  return (
    <p className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] leading-relaxed text-xau">
      <b>Tệp đang cất trên đĩa máy chủ.</b> Dùng tạm ở máy dựng thì được, nhưng
      trên máy chủ thật thì tệp mất sau mỗi lượt triển khai. Còn thiếu:{' '}
      {dang.thieu.join(', ')}.
    </p>
  );
}
