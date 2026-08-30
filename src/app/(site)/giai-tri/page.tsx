import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { phienConLai } from '@/lib/bau-cua';
import { DU_BO, anhRong } from '@/lib/rong-const';
import {
  ANH, BAUCUA_ROUND_MS, GAME_LABELS, OTT_MAX, OTT_MIN, VAN_MOI_NGAY, conLai,
  TRUNG_BOI_VANG, TRUNG_SO, XENG_BIEU_TUONG,
} from '@/lib/mini-game';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Bầu cua, oẳn tù tì, quay xèng, phi tiêu, sóc đĩa, đập trứng, sút phạt — chơi bằng điểm kiếm được trên diễn đàn.',
};
export const dynamic = 'force-dynamic';

/**
 * Khu giải trí — dựng lại từ bộ mod JohnCMS Việt hoá quãng 2008–2011.
 *
 * Để ở `/giai-tri` chứ không phải `/games`: `/games` là KHO GAME tải về, còn
 * đây là mấy trò bấm ngay trên trang. Hai thứ khác hẳn nhau, trộn đường dẫn là
 * người đọc lạc ngay.
 *
 * Trang này cố ý chỉ có ĐÚNG mấy ô trò chơi. Số điểm đã nằm sẵn trên thanh đầu
 * trang rồi, nhắc lại là thừa; còn mấy dòng giới thiệu với "vừa có người chơi"
 * thì đẩy chính mấy ô trò chơi — thứ người ta vào đây để bấm — xuống dưới.
 */
export default async function GiaiTriPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [conBauCua, conOtt, conXeng, conTieu, conSoc, conTrung, conSut] = userId
    ? await Promise.all([
        phienConLai(userId), conLai(userId, 'OANTUTI'), conLai(userId, 'QUAYXENG'),
        conLai(userId, 'PHITIEU'), conLai(userId, 'SOCDIA'), conLai(userId, 'DAPTRUNG'),
        conLai(userId, 'SUTPHAT'),
      ])
    : Array<number>(7).fill(VAN_MOI_NGAY);
  const soCauHoi = await db.quizQuestion.count({ where: { status: 'APPROVED' } });
  const soRongDaNo = await db.rong.count({ where: { noAt: { not: null } } });

  const tro = [
    {
      href: '/giai-tri/bau-cua',
      ten: GAME_LABELS.BAUCUA,
      mo: `Bàn chung, mỗi phiên ${BAUCUA_ROUND_MS / 1000} giây. Đặt nhiều cửa, trúng mấy viên ăn bấy nhiêu.`,
      nhan: `${conBauCua} lượt`,
      anh: [1, 5, 6, 3].map((i) => `${ANH}/baucua/${i}.gif`),
      chu: null as string[] | null,
      nen: 'from-rose-500/15 via-orange-400/10 to-amber-400/20',
      vien: 'hover:border-rose-300 dark:hover:border-rose-800',
      pill: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    },
    {
      href: '/giai-tri/oan-tu-ti',
      ten: GAME_LABELS.OANTUTI,
      mo: `Đấu tay đôi với máy, cược ${OTT_MIN}–${OTT_MAX} điểm. Hoà thì không mất gì.`,
      nhan: `${conOtt} lượt`,
      anh: ['bua', 'keo', 'bao'].map((t) => `${ANH}/ott/${t}.png`),
      chu: null as string[] | null,
      nen: 'from-sky-500/15 via-cyan-400/10 to-emerald-400/20',
      vien: 'hover:border-sky-300 dark:hover:border-sky-800',
      pill: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
    },
    {
      href: '/giai-tri/quay-xeng',
      ten: GAME_LABELS.QUAYXENG,
      mo: 'Ba hàng ba cột. Ba ô giống nhau trên một hàng, một cột hay đường chéo là ăn.',
      nhan: `${conXeng} lượt`,
      // Bốn quả ăn to nhất của bảng trả thưởng, để nhìn ô là đoán được luật.
      anh: [7, 8, 6, 5].map((i) => `${ANH}/quayxeng/${i}.gif`),
      chu: null as string[] | null,
      nen: 'from-amber-500/20 via-yellow-400/10 to-orange-400/20',
      vien: 'hover:border-amber-300 dark:hover:border-amber-800',
      pill: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
    },
    {
      href: '/giai-tri/phi-tieu',
      anhPixel: false,
      ten: GAME_LABELS.PHITIEU,
      mo: 'Ném một mũi, so điểm với máy. Cao hơn thì thắng, bằng nhau thì hoà.',
      nhan: `${conTieu} lượt`,
      anh: [3, 5].map((i) => `${ANH}/phitieu/${i}.gif`),
      chu: null as string[] | null,
      nen: 'from-red-500/15 via-rose-400/10 to-pink-400/20',
      vien: 'hover:border-red-300 dark:hover:border-red-800',
      pill: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
    },
    {
      href: '/giai-tri/soc-dia',
      anhPixel: false,
      ten: GAME_LABELS.SOCDIA,
      mo: 'Bát bốn đồng, đếm mặt ngửa. Đặt chẵn hay lẻ, trúng ăn một ăn một.',
      nhan: `${conSoc} lượt`,
      // Ba đồng: hai ngửa một sấp — nhìn ô là biết trò này đếm cái gì.
      anh: ['ngua', 'sap', 'ngua'].map((t) => `${ANH}/socdia/dong-${t}.png`),
      chu: null as string[] | null,
      nen: 'from-slate-500/20 via-zinc-400/10 to-stone-400/20',
      vien: 'hover:border-slate-300 dark:hover:border-slate-700',
      pill: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      href: '/giai-tri/dap-trung',
      ten: GAME_LABELS.DAPTRUNG,
      mo: `${TRUNG_SO} quả, một quả có quà. Trúng luôn quả vàng thì ăn ${TRUNG_BOI_VANG}×.`,
      nhan: `${conTrung} lượt`,
      anh: ['trung', 'vo', 'trung'].map((t) => `${ANH}/daptrung/${t}.png`),
      chu: null as string[] | null,
      nen: 'from-lime-500/15 via-green-400/10 to-emerald-400/20',
      vien: 'hover:border-lime-300 dark:hover:border-lime-800',
      pill: 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-300',
    },
    {
      href: '/giai-tri/sut-phat',
      anhPixel: false,
      ten: GAME_LABELS.SUTPHAT,
      mo: 'Chọn một trong bốn góc. Thủ môn bay một góc — né được là bóng vào lưới.',
      nhan: `${conSut} lượt`,
      anh: [`${ANH}/sutphat/bong.png`],
      chu: null as string[] | null,
      nen: 'from-green-600/20 via-emerald-500/10 to-teal-400/20',
      vien: 'hover:border-green-300 dark:hover:border-green-800',
      pill: 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300',
    },
    {
      href: '/giai-tri/trac-nghiem',
      ten: 'Trắc nghiệm',
      mo: 'Tự ra câu hỏi và đặt cọc điểm. Trả lời đúng thì ăn cọc của người ra câu.',
      // Trò này không có tranh trong bộ ảnh cũ, nên bày ba dấu hỏi kiểu chữ
      // pixel cho hợp với hai ô bên cạnh, thay vì mượn tạm một cái icon lạc đề.
      anh: [] as string[],
      chu: ['?', '?', '?'] as string[] | null,
      chuMau: 'text-violet-500/70 dark:text-violet-300/70',
      nhan: `${soCauHoi} câu`,
      nen: 'from-violet-500/15 via-fuchsia-400/10 to-indigo-400/20',
      vien: 'hover:border-violet-300 dark:hover:border-violet-800',
      pill: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
    },
    {
      href: '/rong',
      ten: 'Đảo rồng',
      mo: `Ấp trứng, nuôi lớn rồi mang đi đấu. Sưu tầm đủ ${DU_BO} con.`,
      // Ba con mở màn lấy ba loài khác hẳn nhau về dáng, để nhìn ô này là
      // thấy ngay trò có nhiều loài chứ không phải một con đổi màu.
      anh: [[6, 1], [8, 3], [3, 5]].map(([l, m]) => anhRong(l, m)),
      chu: null as string[] | null,
      nhan: `${soRongDaNo} con`,
      nen: 'from-emerald-500/15 via-teal-400/10 to-lime-400/20',
      vien: 'hover:border-emerald-300 dark:hover:border-emerald-800',
      pill: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {tro.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn(
              'group overflow-hidden rounded-2xl border-2 border-ink-100 bg-white transition-all',
              'hover:-translate-y-0.5 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900',
              t.vien,
            )}>
            {/* Dải ảnh: chính bộ ảnh cũ, bày hơi nghiêng như quân bày trên chiếu */}
            <div className={cn(
              'flex h-28 items-center justify-center gap-1.5 bg-gradient-to-br px-4', t.nen,
            )}>
              {t.chu
                ? t.chu.map((c, i) => (
                    <span key={i} aria-hidden
                      className={cn(
                        'font-mono text-4xl font-black transition-transform duration-200 group-hover:-translate-y-1',
                        'chuMau' in t ? t.chuMau : 'text-violet-500/70 dark:text-violet-300/70',
                      )}
                      style={{
                        transitionDelay: `${i * 45}ms`,
                        transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (4 + i * 2)}deg)`,
                      }}>
                      {c}
                    </span>
                  ))
                : t.anh.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    // Khoá theo VỊ TRÍ chứ không theo đường dẫn: ô đập trứng bày
                    // quả nguyên – quả vỡ – quả nguyên, hai quả nguyên trùng ảnh
                    // nên lấy `src` làm khoá là React kêu trùng key ngay.
                    <img key={i} src={src} alt="" aria-hidden
                      className="h-14 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:-translate-y-1"
                      style={{
                        // Bộ ảnh pixel cũ bé tí (19×16), phóng lên gấp mấy lần mà
                        // để trình duyệt nội suy thì nhoè hết nét. Còn ảnh vector
                        // (phỉnh sóc đĩa, bảng phi tiêu, quả bóng) thì ngược lại:
                        // ép pixel hoá là viền tròn thành răng cưa.
                        imageRendering: 'anhPixel' in t && !t.anhPixel ? 'auto' : 'pixelated',
                        transitionDelay: `${i * 45}ms`,
                        transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (3 + i)}deg)`,
                      }} />
                  ))}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink-800 dark:text-ink-100">{t.ten}</p>
                <span className={cn('chip shrink-0 !py-0.5 text-[11px] font-bold', t.pill)}>
                  {t.nhan}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">{t.mo}</p>
            </div>
          </Link>
        ))}
      </div>

      {!userId && (
        <p className="mt-4 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/giai-tri" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để ngồi vào bàn.
        </p>
      )}
    </div>
  );
}
