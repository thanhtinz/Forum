import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, Shield, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { AnhDaiDien } from '@/components/NguoiDung';
import { SaoNam } from '@/components/game/SaoNam';
import { cachDay, catChu } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

/*
 * HỒ SƠ CÔNG KHAI CỦA MỘT THÀNH VIÊN.
 *
 * Khác hẳn `/toi`: chỗ này ai cũng xem được, nên chỉ có thứ người ấy đã tự
 * đăng công khai — đánh giá và bài diễn đàn. Không email, không lượt tải,
 * không ngày ghé gần nhất. Lượt tải là thứ riêng tư nhất trong cả cơ sở dữ
 * liệu này: nó nói người ta chơi gì, mà chẳng ai bấm "tải" với ý định khoe.
 *
 * Tra theo `tenDangNhap` chứ không theo `id`: địa chỉ đọc được thì người ta
 * mới dám dán cho nhau, mà `id` dạng cuid thì dán xong không ai biết là của
 * ai. Tra KHÔNG PHÂN BIỆT HOA THƯỜNG vì người gõ tay địa chỉ hay gõ hoa chữ
 * đầu.
 */

const SO_MUC = 10;

/** Tài khoản bị khoá thì coi như không có. */
async function timNguoi(tho: string) {
  const ten = decodeURIComponent(tho).trim();
  if (!ten) return null;
  return db.nguoiDung.findFirst({
    where: { tenDangNhap: { equals: ten, mode: 'insensitive' }, khoa: false },
    select: {
      id: true, tenHienThi: true, tenDangNhap: true, anh: true, vaiTro: true, taoLuc: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ ten: string }> }): Promise<Metadata> {
  const { ten } = await params;
  const nguoi = await timNguoi(ten);
  if (!nguoi) return { title: 'Không có trang này' };
  return {
    title: nguoi.tenHienThi,
    description: `Đánh giá và bài diễn đàn của ${nguoi.tenHienThi} trên SunnyStore.`,
  };
}

export default async function TrangHoSo({ params }: { params: Promise<{ ten: string }> }) {
  const { ten } = await params;
  const nguoi = await timNguoi(ten);
  if (!nguoi) notFound();

  // Mọi con số lẫn mọi danh sách dưới đây đều chỉ tính game CÒN HIỆN. Hai lý
  // do, và lý do sau mới là lý do chính: game đã gỡ thì hồ sơ không nên là cửa
  // hậu dẫn người ta tới một trang 404; và con số phải đếm đúng thứ bày ra bên
  // dưới nó — "5 đánh giá" mà chỉ liệt kê 3 bài thì người đọc đi tìm 2 bài kia.
  const [soDanhGia, soChuDe, soTraLoi, danhGia, chuDe] = await Promise.all([
    db.danhGia.count({ where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } } }),
    db.chuDe.count({ where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } } }),
    db.traLoi.count({
      where: { nguoiId: nguoi.id, chuDe: { game: { trangThai: 'DANG_HIEN' } } },
    }),
    db.danhGia.findMany({
      where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: SO_MUC,
      select: {
        id: true, sao: true, noiDung: true, taoLuc: true,
        game: { select: { ten: true, duongDan: true } },
      },
    }),
    db.chuDe.findMany({
      where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: SO_MUC,
      select: {
        id: true, tieuDe: true, soTraLoi: true, taoLuc: true,
        game: { select: { ten: true, duongDan: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <header className="flex items-center gap-4">
        <AnhDaiDien ten={nguoi.tenHienThi} anh={nguoi.anh} co={64} />
        <div className="min-w-0">
          <h1 className="tieu-de-trang truncate">{nguoi.tenHienThi}</h1>
          <p className="phu mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>@{nguoi.tenDangNhap}</span>
            <span aria-hidden>·</span>
            <span>Tham gia {format(nguoi.taoLuc, "'tháng' M 'năm' yyyy", { locale: vi })}</span>
            {nguoi.vaiTro === 'QUAN_TRI' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-nhan/12 px-2 py-0.5 font-semibold text-nhan">
                <Shield size={11} aria-hidden /> Quản trị
              </span>
            )}
          </p>
        </div>
      </header>

      <dl className="the flex divide-x divide-vien text-center">
        <O chinh={soDanhGia} nhan="đánh giá" />
        <O chinh={soChuDe} nhan="chủ đề" />
        <O chinh={soTraLoi} nhan="trả lời" />
      </dl>

      <section>
        <h2 className="tieu-de mb-3">Đánh giá gần đây</h2>
        {danhGia.length === 0 ? (
          <Trong icon={<Star size={22} aria-hidden />} chu="Chưa chấm sao game nào." />
        ) : (
          <ul className="the divide-y divide-vien">
            {danhGia.map((d) => (
              <li key={d.id} className="p-4">
                <Link href={`/game/${d.game.duongDan}`}
                  className="text-[14px] font-semibold hover:underline">
                  {d.game.ten}
                </Link>
                <p className="mt-1 flex items-center gap-1.5">
                  <SaoNam diem={d.sao} co={11} />
                  <span className="phu">{cachDay(d.taoLuc)}</span>
                </p>
                {/* Cắt bớt bài dài: đây là trang lướt qua xem người này viết
                    gì, đọc trọn bài thì sang trang game. */}
                {d.noiDung && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mo">
                    {catChu(d.noiDung, 240)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="tieu-de mb-3">Bài trên diễn đàn</h2>
        {chuDe.length === 0 ? (
          <Trong icon={<MessageSquare size={22} aria-hidden />} chu="Chưa mở chủ đề nào." />
        ) : (
          <ul className="the divide-y divide-vien">
            {chuDe.map((c) => (
              <li key={c.id}>
                <Link href={`/game/${c.game.duongDan}/dien-dan/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-nen3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{c.tieuDe}</span>
                    <span className="phu mt-0.5 block truncate">
                      {c.game.ten} · {cachDay(c.taoLuc)}
                    </span>
                  </span>
                  <span className="phu flex shrink-0 items-center gap-1">
                    <MessageSquare size={12} aria-hidden /> {c.soTraLoi}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function O({ chinh, nhan }: { chinh: number; nhan: string }) {
  return (
    <div className="flex-1 px-2 py-3">
      <dd className="text-[17px] font-bold leading-none">{chinh}</dd>
      <dt className="phu mt-1">{nhan}</dt>
    </div>
  );
}

function Trong({ icon, chu }: { icon: React.ReactNode; chu: string }) {
  return (
    <div className="the p-8 text-center">
      <span className="text-mo">{icon}</span>
      <p className="phu mt-2">{chu}</p>
    </div>
  );
}
