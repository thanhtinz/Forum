import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { cachDay, gonSo } from '@/lib/tien-ich';
import { AnhDaiDien } from '@/components/NguoiDung';
import { MO_TA_MUC_CHUNG, MUC_CHUNG, TEN_MUC_CHUNG } from '@/lib/chuyen-muc-const';

interface HangMuc {
  ma: string;
  ten: string;
  moTa: string;
  anh: string;
  soChuDe: number;
  soBai: number;
  moi: {
    id: string;
    tieuDe: string;
    luc: Date;
    ten: string;
    anh: string | null;
  } | null;
}

/**
 * BẢNG CHUYÊN MỤC của diễn đàn một game — bảng mục lục quen thuộc của diễn đàn.
 *
 * Mỗi hàng là một chuyên mục: biểu tượng, tên, một dòng nói nó bàn chuyện gì,
 * hai con số ở giữa (bao nhiêu chủ đề, bao nhiêu bài), và bài mới nhất ở mép
 * phải. Bốn thứ ấy trả lời đúng bốn câu người ta hỏi khi mở một diễn đàn ra:
 * chỗ này bàn gì, có đông không, còn sống không, và ai vừa nói.
 *
 * Bảng chuyên mục dùng chung cho cả cửa hàng (xem model `ChuyenMuc`), nhưng
 * MỌI con số ở đây đều lọc theo `gameId` — vào game nào cũng thấy đúng mấy mục
 * ấy, mà bấm vào thì chỉ ra chuyện của game đang xem.
 */
export async function BangChuyenMuc({ gameId, duongDan }: {
  gameId: string;
  duongDan: string;
}) {
  const muc = await db.chuyenMuc.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    select: { id: true, ten: true, duongDan: true, moTa: true, anh: true },
  });

  /*
   * Đếm GỘP cho mọi mục trong MỘT câu, không phải mỗi mục một câu.
   *
   * Mười lăm chuyên mục nhân hai con số là ba mươi lượt hỏi cho một trang mà
   * người ta chỉ lướt qua. `groupBy` trả cả bảng trong một lượt, rồi ghép ở
   * đây — chỗ này chạy mỗi lần ai đó mở tab diễn đàn của bất kỳ game nào.
   *
   * Số BÀI cộng từ `soTraLoi` — con số đếm sẵn trên từng chủ đề, cửa hàng vẫn
   * giữ đúng trong cùng giao dịch với lượt ghi lời đáp. Đếm thẳng bảng `TraLoi`
   * thì phải nối bảng để biết lời đáp ấy thuộc mục nào, mà Prisma không gộp
   * theo cột của bảng bên kia được — thành ra mỗi mục một câu, đúng thứ vừa
   * tránh.
   */
  const gop = await db.chuDe.groupBy({
    by: ['chuyenMucId'],
    where: { gameId },
    _count: { _all: true },
    _sum: { soTraLoi: true },
  });

  const soChuDe = new Map<string | null, number>(
    gop.map((x) => [x.chuyenMucId, x._count._all]),
  );
  const soTraLoi = new Map<string | null, number>(
    gop.map((x) => [x.chuyenMucId, x._sum.soTraLoi ?? 0]),
  );

  /*
   * Bài mới nhất của từng mục: một câu cho cả bảng, rồi tự nhặt.
   *
   * Lấy `TRAN_MOI` chủ đề mới nhất của game rồi giữ chủ đề đầu tiên gặp ở mỗi
   * mục. Không chuẩn tuyệt đối — một mục im lặng lâu hơn `TRAN_MOI` chủ đề thì
   * cột "mới nhất" của nó bỏ trống — nhưng đổi lại là MỘT lượt hỏi thay vì một
   * lượt cho mỗi mục, và cột ấy vốn để nói "chỗ này còn sống không", nên im
   * lặng quá lâu thì bỏ trống cũng là một câu trả lời đúng.
   */
  const TRAN_MOI = 60;
  const moiNhat = await db.chuDe.findMany({
    where: { gameId },
    orderBy: [{ traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
    take: TRAN_MOI,
    select: {
      id: true, tieuDe: true, traLoiCuoiLuc: true, chuyenMucId: true,
      nguoi: { select: { tenHienThi: true, anh: true } },
    },
  });
  const moiTheoMuc = new Map<string | null, HangMuc['moi']>();
  for (const c of moiNhat) {
    if (moiTheoMuc.has(c.chuyenMucId)) continue;
    moiTheoMuc.set(c.chuyenMucId, {
      id: c.id, tieuDe: c.tieuDe, luc: c.traLoiCuoiLuc,
      ten: c.nguoi.tenHienThi, anh: c.nguoi.anh,
    });
  }

  const dung = (ma: string, ten: string, moTa: string, anh: string, khoa: string | null): HangMuc => ({
    ma, ten, moTa, anh,
    soChuDe: soChuDe.get(khoa) ?? 0,
    soBai: (soChuDe.get(khoa) ?? 0) + (soTraLoi.get(khoa) ?? 0),
    moi: moiTheoMuc.get(khoa) ?? null,
  });

  const hang: HangMuc[] = muc.map((m) =>
    dung(m.duongDan, m.ten, m.moTa ?? '', m.anh ?? '', m.id));

  /*
   * Mục "Chung" chỉ hiện khi THẬT SỰ có bài nằm ngoài mọi chuyên mục.
   *
   * Cửa hàng dựng chuyên mục xong, mọi bài mới đều có mục — lúc ấy một hàng
   * "Chung: 0 chủ đề" nằm cuối bảng là một hàng chẳng bao giờ bấm vào. Nhưng
   * bài cũ mở trước đợt này thì không có mục nào, và giấu hàng ấy đi là giấu
   * luôn cả diễn đàn cũ.
   */
  const chung = dung(MUC_CHUNG, TEN_MUC_CHUNG, MO_TA_MUC_CHUNG, '', null);
  if (chung.soChuDe > 0) hang.push(chung);

  if (hang.length === 0) return null;

  return (
    <section aria-label="Chuyên mục" className="the overflow-hidden">
      <h2 className="border-b border-vien bg-nen3/60 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-mo">
        Chuyên mục
      </h2>
      <ul className="divide-y divide-vien">
        {hang.map((h) => (
          <li key={h.ma}>
            <Link href={`/game/${duongDan}/dien-dan?muc=${h.ma}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3/70">
              <Bieu ten={h.ten} anh={h.anh} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{h.ten}</span>
                {h.moTa && <span className="phu mt-0.5 block truncate">{h.moTa}</span>}
                {/* Trên điện thoại hai cột số bên phải không có chỗ đứng, mà
                    bỏ hẳn thì hàng nào cũng như hàng nào — không biết mục nào
                    đông. Gộp lại thành một dòng nhỏ ngay dưới mô tả. */}
                <span className="phu mt-0.5 block text-[12px] sm:hidden">
                  {gonSo(h.soChuDe)} chủ đề · {gonSo(h.soBai)} bài
                </span>
              </span>

              {/*
                Hai con số đứng thành CỘT CÓ NHÃN, không phải hai chữ số trần.
                Diễn đàn nào cũng bày đúng hai con số này, và người mới thì
                không đoán ra cái nào là chủ đề cái nào là bài.
              */}
              <span className="hidden shrink-0 gap-5 px-2 text-center sm:flex">
                <span className="w-14">
                  <span className="block text-[14px] font-bold leading-none">{gonSo(h.soChuDe)}</span>
                  <span className="phu mt-1 block text-[11px]">chủ đề</span>
                </span>
                <span className="w-14">
                  <span className="block text-[14px] font-bold leading-none">{gonSo(h.soBai)}</span>
                  <span className="phu mt-1 block text-[11px]">bài</span>
                </span>
              </span>

              {/* Cột "mới nhất" là cột rộng nhất và cũng là cột rụng đầu tiên
                  khi màn hình hẹp: trên điện thoại, tên chủ đề dài hơn cả bề
                  ngang máy, nên nó đẩy mọi thứ khác ra ngoài. */}
              <span className="hidden w-[190px] shrink-0 items-center gap-2 border-l border-vien pl-3 lg:flex">
                {h.moi ? (
                  <>
                    <AnhDaiDien ten={h.moi.ten} anh={h.moi.anh} co={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold">{h.moi.tieuDe}</span>
                      <span className="phu block truncate text-[11px]">
                        {h.moi.ten} · {cachDay(h.moi.luc)}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="phu text-[12px]">Chưa có bài</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Biểu tượng chuyên mục; chưa đặt ảnh thì lấy hình chung. */
function Bieu({ ten, anh }: { ten: string; anh: string }) {
  if (anh) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={anh} alt="" className="bieu-tuong size-11 shrink-0 object-cover" />;
  }
  return (
    <span aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-nut bg-nhan/10 text-nhan"
      title={ten}>
      <MessagesSquare size={19} />
    </span>
  );
}
