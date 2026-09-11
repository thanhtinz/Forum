'use client';

import { useEffect, useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';

/**
 * Lời mời cài SunnyStore thành ứng dụng.
 *
 * Hai đường hoàn toàn khác nhau, vì hai hệ điều hành làm hai kiểu:
 *
 *   • Android/Chrome bắn ra sự kiện `beforeinstallprompt`. Giữ lại sự kiện ấy
 *     rồi gọi `prompt()` lúc người dùng bấm — gọi ngay lúc nhận thì trình duyệt
 *     chặn, vì nó đòi phải có một cú bấm thật của người dùng.
 *   • iOS/Safari KHÔNG có sự kiện ấy và không cho trang nào tự mở hộp cài.
 *     Lối duy nhất là người dùng tự bấm nút Chia sẻ rồi "Thêm vào Màn hình
 *     chính". Nên ở đó ta chỉ chỉ đường, không hứa một cú bấm.
 *
 * Đóng rồi thì KHÔNG hỏi lại, nhớ qua `localStorage`. Một dải mời cài hiện lại
 * mỗi lần mở trang là thứ khiến người ta học cách phớt lờ mọi dải trên trang.
 */
const KHOA = 'sunny:thoi-moi-cai';

interface SuKienCai extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function NutCaiUngDung() {
  const [suKien, datSuKien] = useState<SuKienCai | null>(null);
  const [chiDuongIOS, datChiDuongIOS] = useState(false);
  const [an, datAn] = useState(true);

  useEffect(() => {
    try { if (localStorage.getItem(KHOA)) return; } catch { /* chặn thì coi như chưa từ chối */ }

    // Đã chạy ở dạng ứng dụng rồi thì mời cài nữa là vô nghĩa.
    const daCai = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    if (daCai) return;

    const nghe = (e: Event) => {
      e.preventDefault(); // chặn dải mời mặc định của trình duyệt, để tự bày
      datSuKien(e as SuKienCai);
      datAn(false);
    };
    window.addEventListener('beforeinstallprompt', nghe);

    // iOS: nhận ra bằng chuỗi trình duyệt, vì không có sự kiện nào để nghe.
    // Chỉ nhận Safari — Chrome trên iOS không thêm được vào màn hình chính.
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      datChiDuongIOS(true);
      datAn(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', nghe);
  }, []);

  const thoi = () => {
    datAn(true);
    try { localStorage.setItem(KHOA, '1'); } catch { /* không nhớ được thì thôi */ }
  };

  if (an) return null;

  return (
    <div className="the-noi mb-4 flex items-start gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
        <SquarePlus size={19} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold">Cài SunnyStore lên màn hình chính</p>
        {chiDuongIOS ? (
          <p className="phu mt-1 flex flex-wrap items-center gap-1">
            Bấm <Share size={13} className="inline shrink-0" aria-label="nút Chia sẻ" />
            ở thanh dưới, rồi chọn “Thêm vào Màn hình chính”.
          </p>
        ) : (
          <>
            <p className="phu mt-1">Mở nhanh hơn, và chạy toàn màn hình như một ứng dụng thật.</p>
            <button type="button" className="nut-xam mt-2.5"
              onClick={async () => {
                if (!suKien) return;
                await suKien.prompt();
                await suKien.userChoice;
                // Dù nhận hay từ chối cũng cất lời mời đi: sự kiện chỉ dùng
                // được một lần, gọi `prompt()` lần hai là trình duyệt ném lỗi.
                thoi();
              }}>
              Cài ứng dụng
            </button>
          </>
        )}
      </div>

      <button type="button" onClick={thoi} aria-label="Thôi, đừng mời nữa"
        className="grid size-8 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-nen3">
        <X size={16} />
      </button>
    </div>
  );
}
