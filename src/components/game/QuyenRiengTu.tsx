import { Hand, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { LOAI, MUC, type MaLoai, type MaMuc } from '@/lib/quyen-rieng-tu-const';

export interface DuLieuKhai { loai: string; muc: string }

/*
 * QUYỀN RIÊNG TƯ CỦA GAME — chép theo bảng "App Privacy" của App Store.
 *
 * VÌ SAO NÓ PHẢI NẰM TRÊN TRANG, TRƯỚC KHI BẤM TẢI. Android hiện danh sách
 * quyền lúc CÀI, tệp JAR thì chẳng hiện gì cả — tới lúc ấy người ta đã tải
 * xong và đang háo hức, nên bấm đồng ý cho xong. Đặt bảng này cạnh bảng thông
 * tin là đặt nó vào đúng lúc người đọc còn đang cân nhắc.
 *
 * BA TRẠNG THÁI, KHÔNG PHẢI HAI. "Chưa khai" khác hẳn "khai rồi mà không thu
 * thập gì": cái đầu là người tải KHÔNG BIẾT GÌ, cái sau là một lời hứa của nhà
 * phát triển. Gộp hai thứ ấy làm một là biến sự im lặng thành một lời hứa
 * chẳng ai từng nói ra.
 *
 * Và chữ phải luôn là "nhà phát triển cho biết". Đây là LỜI KHAI của người bày
 * hàng chứ không phải thứ cửa hàng đo được; viết như thể SunnyStore đã kiểm
 * chứng là bảo lãnh cho một điều mình không biết.
 */
export function QuyenRiengTu({ daKhai, duLieu }: {
  daKhai: boolean;
  duLieu: DuLieuKhai[];
}) {
  return (
    <section>
      <h2 className="tieu-de mb-3">Quyền riêng tư</h2>
      <div className="the p-4">
        {!daKhai ? (
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mo">
            <ShieldQuestion size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Nhà phát triển chưa cho biết game này thu thập dữ liệu gì. Chưa khai
              không có nghĩa là không thu thập — chỉ là chưa ai nói.
            </span>
          </p>
        ) : duLieu.length === 0 ? (
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-nhan" aria-hidden />
            <span>
              Nhà phát triển cho biết game này <b>không thu thập dữ liệu nào</b> của bạn.
            </span>
          </p>
        ) : (
          <div className="space-y-4">
            <p className="phu flex items-start gap-2.5 leading-relaxed">
              <Hand size={17} className="mt-0.5 shrink-0" aria-hidden />
              <span>Nhà phát triển cho biết game này có thể thu thập mấy thứ dưới đây.</span>
            </p>

            {/* Nặng trước, nhẹ sau — thứ tự trong `MUC`. Người đọc phần lớn chỉ
                liếc dòng đầu, nên dòng đầu phải là dòng đáng lo nhất. */}
            {MUC.map((m) => {
              const trong = duLieu.filter((d) => d.muc === m.ma);
              if (trong.length === 0) return null;
              return (
                <div key={m.ma} className="vach border-t pt-3 first:border-0 first:pt-0">
                  <h3 className="text-[14px] font-bold">{m.ten}</h3>
                  <p className="phu mt-0.5 leading-relaxed">{m.ta}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {xepTheoBang(trong).map((loai) => (
                      <li key={loai}
                        className="rounded-full bg-nen3/70 px-2.5 py-1 text-[12px] font-medium">
                        {LOAI.find((l) => l.ma === loai)?.ten ?? loai}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Xếp mấy nhóm dữ liệu theo đúng thứ tự trong `LOAI`.
 *
 * Không để nguyên thứ tự cơ sở dữ liệu trả về: thứ tự ấy là thứ tự người bày
 * hàng bấm chuột, nên hai game khai y hệt nhau lại bày ra hai thứ tự khác
 * nhau — mà bảng này sinh ra để người ta SO hai game với nhau.
 */
function xepTheoBang(trong: DuLieuKhai[]): string[] {
  const co = new Set(trong.map((d) => d.loai));
  return LOAI.filter((l) => co.has(l.ma)).map((l) => l.ma);
}

export type { MaLoai, MaMuc };
