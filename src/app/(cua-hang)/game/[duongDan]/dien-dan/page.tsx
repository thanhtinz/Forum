import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CircleCheckBig, Lock, MessageSquare, PenLine, Pin } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, kep, soTrang } from '@/lib/tien-ich';
import { rutGon } from '@/lib/trich-dan-const';
import { AnhDaiDien } from '@/components/NguoiDung';

/*
 * Mỗi trang bao nhiêu chủ đề.
 *
 * Trước đây danh sách lấy `take: 50` rồi thôi — game nào bàn tán sôi nổi thì
 * chủ đề thứ năm mươi mốt trở đi KHÔNG CÓ LỐI NÀO TỚI ĐƯỢC, kể cả khi người
 * ta vừa đăng nó xong: bài mới nhất đẩy bài cũ tụt xuống, mà tụt khỏi năm
 * mươi là mất. Chỗ này không phải "lười tải thêm", nó là mất nội dung.
 */
const MOI_TRANG = 20;

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({ where: { duongDan }, select: { ten: true } });
  return { title: g ? `Diễn đàn ${g.ten}` : 'Diễn đàn' };
}

/*
 * TAB "DIỄN ĐÀN" của một game.
 *
 * Không có bảng chuyên mục nào cả: người ta bàn về MỘT GAME cụ thể, không bàn
 * về "chuyên mục game hành động". Vào được đây tức là đã ở trong trang của
 * game ấy rồi, nên khung chung đã lo phần tên game và nút tải.
 */
export default async function TabDienDan({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { duongDan } = await params;
  const { trang: trangNhap } = await searchParams;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { id: true, duongDan: true },
  });
  if (!game) notFound();

  const tong = await db.chuDe.count({ where: { gameId: game.id } });
  // Kẹp trang vào khoảng có thật: `?trang=99` trên diễn đàn hai trang thì đưa
  // về trang cuối, chứ không trả một danh sách rỗng trông như diễn đàn chết.
  const trang = kep(trangNhap, 1, soTrang(tong, MOI_TRANG), 1);

  const chuDe = await db.chuDe.findMany({
    where: { gameId: game.id },
    /*
      Khoá phụ `id` là thứ bắt buộc, không phải cho đẹp.
      Hai chủ đề cùng `traLoiCuoiLuc` (rất dễ xảy ra: chủ đề vừa tạo lấy mốc
      `now()`) mà không có khoá phụ thì Postgres được quyền xếp tuỳ ý mỗi lần
      hỏi — sang trang 2 có thể gặp lại đúng chủ đề đã thấy ở trang 1, và một
      chủ đề khác thì không trang nào có.
    */
    orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: {
      id: true, tieuDe: true, noiDung: true, ghim: true, khoa: true,
      soTraLoi: true, traLoiCuoiLuc: true, loiGiaiId: true,
      nguoi: { select: { tenHienThi: true, anh: true } },
      /*
       * Người viết bài GẦN NHẤT, lấy kèm trong cùng một câu.
       *
       * Dòng "ai nói cuối cùng" là thứ quyết định người ta có bấm vào hay
       * không: một chủ đề mở ba hôm trước mà vừa có người đáp lúc nãy thì
       * đáng xem hơn hẳn một chủ đề mở lúc nãy chưa ai đáp. Hỏi riêng cho từng
       * chủ đề thì hai mươi chủ đề là hai mươi câu truy vấn.
       */
      traLoi: {
        orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { nguoi: { select: { tenHienThi: true, anh: true } } },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="phu">
          {tong > 0 ? `${gonSo(tong)} chủ đề` : 'Chưa có chủ đề nào'}
        </p>
        <Link href={`/game/${game.duongDan}/dien-dan/dang`}
          className="nut-cai-dam shrink-0 !min-h-[36px] !px-4 !text-[13px]">
          <PenLine size={15} aria-hidden /> Đăng bài
        </Link>
      </div>

      {tong === 0 ? (
        <div className="the p-8 text-center">
          <MessageSquare size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa ai mở lời</p>
          <p className="phu mt-1">
            Hỏi cách qua màn, báo lỗi gặp phải, hay chỉ để nói chuyện về game này.
          </p>
        </div>
      ) : (
        <>
        {/*
          MỖI CHỦ ĐỀ MỘT HÀNG CÓ MẶT NGƯỜI, có một dòng trích, có ai vừa nói.

          Bản trước là một bảng hai dòng chữ nhỏ: tiêu đề, tên, một con số bên
          phải. Đọc được, nhưng không nói được thứ người ta thật sự đang hỏi
          khi lướt một diễn đàn — "chuyện này có gì hay không, và còn sống
          không". Một dòng trích trả lời vế đầu, mặt người và "ai vừa nói" trả
          lời vế sau.
        */}
        <ul aria-label="Danh sách chủ đề" className="the divide-y divide-vien">
          {chuDe.map((c) => {
            const cuoi = c.traLoi[0]?.nguoi;
            return (
              <li key={c.id}>
                <Link href={`/game/${game.duongDan}/dien-dan/${c.id}`}
                  className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-nen3/70">
                  <span className="mt-0.5 shrink-0">
                    <AnhDaiDien ten={c.nguoi.tenHienThi} anh={c.nguoi.anh} co={38} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {c.ghim && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-nhan/12 px-1.5 py-0.5 text-[11px] font-bold text-nhan">
                          <Pin size={10} aria-label="ghim" /> Ghim
                        </span>
                      )}
                      {c.loiGiaiId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-nhan/12 px-1.5 py-0.5 text-[11px] font-bold text-nhan">
                          <CircleCheckBig size={10} aria-label="đã có lời giải" /> Đã giải
                        </span>
                      )}
                      {c.khoa && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-nen3 px-1.5 py-0.5 text-[11px] font-bold text-mo">
                          <Lock size={10} aria-label="đã khoá" /> Khoá
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[15px] font-semibold">{c.tieuDe}</span>
                    </span>

                    {/* Một dòng trích, chỉ một dòng: đủ để đoán chuyện gì, chưa
                        đủ để thay việc mở chủ đề ra đọc. */}
                    <span className="phu mt-0.5 block truncate">{rutGon(c.noiDung, 110)}</span>

                    <span className="phu mt-1 block truncate text-[12px]">
                      {c.nguoi.tenHienThi} mở
                      {cuoi
                        ? ` · ${cuoi.tenHienThi} trả lời ${cachDay(c.traLoiCuoiLuc)}`
                        : ` · ${cachDay(c.traLoiCuoiLuc)}`}
                    </span>
                  </span>

                  {/* Con số đứng thành CỘT có nhãn, không phải một chữ số lạc
                      cạnh biểu tượng — liếc một cái là biết nó đếm cái gì. */}
                  <span className="flex shrink-0 flex-col items-center justify-center px-1">
                    <span className="text-[15px] font-bold leading-none">{c.soTraLoi}</span>
                    <span className="phu mt-0.5 text-[11px]">trả lời</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
          dungDuong={(t) => `/game/${game.duongDan}/dien-dan${t > 1 ? `?trang=${t}` : ''}`} />
        </>
      )}
    </div>
  );
}
