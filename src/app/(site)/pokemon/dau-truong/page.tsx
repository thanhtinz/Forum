import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chotDauQuaHan, chotMuaDau } from '@/lib/pokemon-dau';
import { DAU_GIO_VANG, DAU_HAN_MS, hangTheoDiem, laGioVang } from '@/lib/pokemon-const';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { DauTruong } from '@/components/pokemon/DauTruong';

export const metadata: Metadata = { title: 'Đấu trường — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangDauTruong() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/dau-truong');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId }, include: { raTran: true } });
  if (!nv) redirect('/pokemon');

  // Chốt lười: kèo quá hạn được dọn ngay lúc có người mở trang, không cần
  // tiến trình nền nào cả.
  await chotDauQuaHan();
  // Chốt mùa cũ cũng LƯỜI, ngay tại lượt đọc này — không tiến trình nền nào.
  const chotMua = await chotMuaDau(nv.id);

  const [cuaToi, keo, xong, hang] = await Promise.all([
    db.pokeDau.findFirst({
      where: { ketThuc: null, OR: [{ chuId: nv.id }, { doiId: nv.id }] },
      include: { chu: { select: { ten: true } }, doi: { select: { ten: true } } },
    }),
    db.pokeDau.findMany({
      where: { ketThuc: null, doiId: null, NOT: { chuId: nv.id } },
      orderBy: { createdAt: 'desc' },
      take: CONFIG_LIST_CAP,
      include: { chu: { select: { ten: true, cap: true, diemDau: true } } },
    }),
    // Những dòng đã `ketThuc` vốn nằm chết trong bảng, không màn nào đọc ra.
    db.pokeDau.findMany({
      where: { ketThuc: { not: null }, OR: [{ chuId: nv.id }, { doiId: nv.id }] },
      orderBy: { ketThuc: 'desc' },
      take: 10,
      select: {
        id: true, chuId: true, thangId: true, ketThuc: true, ke: true,
        chu: { select: { ten: true } }, doi: { select: { ten: true } },
      },
    }),
    db.pokeNhanVat.findMany({
      where: { thangDau: { gt: 0 } },
      orderBy: { diemDau: 'desc' },
      take: 10,
      select: { id: true, ten: true, diemDau: true, thangDau: true },
    }),
  ]);

  const con = nv.raTran
    ?? (await db.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } }));

  return (
    <>
      <section className="dao-tam p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Đấu trường</h1>
          <span className="retro-sub text-ink-400">
            {nv.diemDau} điểm · thắng {nv.thangDau} trận
          </span>
        </div>
        {chotMua && (
          <p className="man-hien mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Mùa {String(chotMua.muaCu).slice(4)}/{String(chotMua.muaCu).slice(0, 4)} đã khép
            lại ở {chotMua.diemCu} điểm
            {chotMua.hang
              ? ` — hạng “${chotMua.hang.ten}”, nhận ${chotMua.hang.vang.toLocaleString('vi')} vàng`
                + `${chotMua.hang.ngoc ? `, ${chotMua.hang.ngoc} ngọc` : ''}`
                + `${chotMua.hang.da ? `, ${chotMua.hang.da} đá tiến cấp` : ''}.`
              : ' — chưa tới mốc thưởng nào.'}
            {' '}Điểm đã đặt lại cho mùa mới.
          </p>
        )}
        <p className="mb-4 text-sm text-ink-500">
          Đánh luân phiên từng lượt, mỗi lượt {DAU_HAN_MS / 60_000} phút — quá giờ là
          xử thua. Sát thương ở đây là chiêu số n của bạn trừ chiêu số n của đối thủ,
          nên cái đáng đoán là đối thủ yếu ở chiêu nào.
          {laGioVang()
            ? ' Đang là giờ vàng — thưởng gấp đôi.'
            : ` Thưởng gấp đôi vào ${DAU_GIO_VANG} giờ mỗi ngày.`}
        </p>

        <DauTruong
          toiId={nv.id}
          cap={nv.cap}
          con={con && { ten: con.ten, nguon: con.nguon, nac: con.nac, he: con.he, mau: con.mau, mauToiDa: con.mauToiDa }}
          tran={cuaToi && {
            id: cuaToi.id,
            laChu: cuaToi.chuId === nv.id,
            coDoi: !!cuaToi.doiId,
            luotCua: cuaToi.luotCua,
            hanLuc: cuaToi.hanLuc.getTime(),
            ke: cuaToi.ke,
            capMin: cuaToi.capMin, capMax: cuaToi.capMax,
            chu: {
              ten: cuaToi.chuTen, nguon: cuaToi.chuNguon, nac: cuaToi.chuNac, he: cuaToi.chuHe,
              mau: cuaToi.chuMau, mauToiDa: cuaToi.chuMauToiDa,
              chieu: cuaToi.chuChieu, tenChieu: cuaToi.chuTenChieu, nguoi: cuaToi.chu.ten,
            },
            doi: cuaToi.doiId ? {
              ten: cuaToi.doiTen ?? '', nguon: cuaToi.doiNguon ?? 0, nac: cuaToi.doiNac ?? 1,
              he: cuaToi.doiHe ?? 1, mau: cuaToi.doiMau ?? 0, mauToiDa: cuaToi.doiMauToiDa ?? 1,
              chieu: cuaToi.doiChieu, tenChieu: cuaToi.doiTenChieu, nguoi: cuaToi.doi?.ten ?? '',
            } : null,
          }}
          keo={keo.map((k) => ({
            id: k.id, nguoi: k.chu.ten, cap: k.chu.cap,
            capMin: k.capMin, capMax: k.capMax, hanLuc: k.hanLuc.getTime(),
            ten: k.chuTen, nguon: k.chuNguon, nac: k.chuNac, he: k.chuHe,
            diem: k.chu.diemDau,
          }))}
          diem={nv.diemDau}
          tenHang={hangTheoDiem(nv.diemDau)?.ten ?? null}
          xong={xong.map((t) => ({
            id: t.id,
            doiThu: (t.chuId === nv.id ? t.doi?.ten : t.chu.ten) ?? 'đối thủ đã rời đảo',
            thang: t.thangId === nv.id,
            hoa: t.thangId == null,
            luc: t.ketThuc?.getTime() ?? 0,
          }))}
          bang={hang.map((h) => ({
            id: h.id, ten: h.ten, diem: h.diemDau, thang: h.thangDau, laToi: h.id === nv.id,
          }))} />
      </section>
    </>
  );
}
