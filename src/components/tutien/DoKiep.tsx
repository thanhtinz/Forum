'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doThienKiep, type TienState } from '@/app/(site)/tu-tien/actions';
import type { NhanVatXem } from '@/lib/tu-tien';
import {
  BAC_TOI_DA, CHUAN_BI, PHAT_DO_KIEP, satThuongLoi, tenCanhGioi, tiLeQuaKiep,
  timThienKiep,
} from '@/lib/tu-tien-const';
import { cn } from '@/lib/utils';
import { ManKiep } from './ManKiep';

/**
 * Chuẩn bị Thiên kiếp — một trong bốn màn mockup ưu tiên của blueprint (mục 8).
 *
 * Màn này phải trả lời được ba câu ở mục 9: điều kiện còn thiếu là gì, rủi ro
 * chính nằm ở đâu, và giảm rủi ro bằng cách nào. Nên nó xếp theo đúng thứ tự
 * ấy — checklist trước, dự báo giữa, đồ chuẩn bị sau — chứ không bày một nút
 * "Độ kiếp" rồi để người chơi tự đoán.
 *
 * DỰ BÁO TÍNH BẰNG ĐÚNG HÀM MÁY CHỦ DÙNG (`tiLeQuaKiep`), không phải một con
 * số ước chừng viết riêng cho giao diện. Hai bộ phép tính là kiểu gì cũng có
 * ngày lệch nhau, mà lệch ở đây thì hoá ra nói dối người chơi ngay tại chỗ
 * blueprint gọi là "quyết định rủi ro".
 */
export function DoKiep({ nv }: { nv: NhanVatXem }) {
  const router = useRouter();
  const [chon, setChon] = useState<string[]>([]);
  const [tin, setTin] = useState<TienState>({});
  const [dangLam, batDau] = useTransition();

  const k = timThienKiep(nv.bac);
  const gia = CHUAN_BI.filter((m) => chon.includes(m.ma)).reduce((s, m) => s + m.gia, 0);
  const duTien = nv.linhThach >= gia;

  const duBao = useMemo(
    () => tiLeQuaKiep(nv.thuocTinh, nv.suc, nv.hp, nv.bac, chon),
    [nv.thuocTinh, nv.suc, nv.hp, nv.bac, chon],
  );

  const dieuKien = [
    {
      dat: nv.laDotPha,
      ten: 'Đang ở tầng Viên mãn',
      thieu: 'Còn phải lên hết bốn tầng của bậc này đã.',
      di: { href: '/tu-tien/tu-luyen', ten: 'Đi bế quan' },
    },
    {
      dat: nv.tuVi >= nv.tuViCan && nv.tuViCan > 0,
      ten: `Tu vi đầy (${nv.tuVi.toLocaleString('vi')}/${nv.tuViCan.toLocaleString('vi')})`,
      thieu: `Còn thiếu ${Math.max(0, nv.tuViCan - nv.tuVi).toLocaleString('vi')} tu vi.`,
      di: { href: '/tu-tien/tu-luyen', ten: 'Đi bế quan' },
    },
    {
      dat: nv.bac < BAC_TOI_DA,
      ten: 'Còn bậc cảnh giới để lên',
      thieu: 'Đã tới trần của giai đoạn này.',
      di: null,
    },
    {
      dat: nv.hp > 1,
      ten: `Thân thể chịu được (${nv.hp}/${nv.suc.hpToiDa} khí huyết)`,
      thieu: 'Thương thế còn nặng — máu hồi theo giờ, nghỉ đã.',
      di: { href: '/tu-tien/the-gioi', ten: 'Về bản đồ' },
    },
  ];

  const sanSang = dieuKien.every((d) => d.dat) && !!k;

  const lam = () => batDau(async () => {
    const fd = new FormData();
    fd.set('chuanBi', chon.join(','));
    setTin(await doThienKiep({}, fd));
    router.refresh();
  });

  if (tin.kiep) {
    return (
      <div className="space-y-3">
        <ManKiep key={JSON.stringify(tin.kiep.dienBien)} k={tin.kiep} />
        <Link href="/tu-tien" className="tien-nut-vien block px-4 py-3 text-center text-sm">
          Về Đạo Đường
        </Link>
      </div>
    );
  }

  // Cửa nào yếu hơn thì đó là chỗ đáng tiêu tiền — nói thẳng ra thay vì để
  // người chơi tự so hai con số phần trăm.
  const cuaYeu = duBao.song <= duBao.tam ? 'than' : 'tam';

  return (
    <div className="space-y-4">
      {tin.error && <p className="tien-son text-sm font-semibold">{tin.error}</p>}

      <section className="tien-trieu p-5">
        <h2 className="tien-canh-gioi text-lg font-black">{k?.ten ?? 'Chưa có kiếp nào'}</h2>
        <p className="tien-mo mb-3 text-sm">
          {k
            ? <>Chịu hết {k.soDao} đạo lôi rồi giữ cho đạo tâm không vỡ, thì{' '}
                <b className="tien-vang">{tenCanhGioi(nv.bac + 1, 1, nv.dao)}</b> mở ra.</>
            : 'Bậc này chưa có thiên kiếp để độ.'}
        </p>

        <ul className="space-y-1.5 text-sm">
          {dieuKien.map((d) => (
            <li key={d.ten} className="flex flex-wrap items-baseline gap-x-2">
              <span className={d.dat ? 'tien-dieu-kien-dat' : 'tien-dieu-kien-thieu'}>
                {d.dat ? 'Đạt' : 'Thiếu'} — {d.ten}
              </span>
              {!d.dat && (
                <>
                  <span className="tien-mo text-xs">{d.thieu}</span>
                  {d.di && (
                    <Link href={d.di.href} className="tien-dao-mau text-xs font-semibold underline underline-offset-2">
                      {d.di.ten}
                    </Link>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {k && (
        <>
          <section className="tien-tam p-5">
            <h2 className="mb-1 text-lg font-black">Dự báo</h2>
            <p className="tien-mo mb-3 text-sm">
              Tính bằng đúng công thức máy chủ sẽ dùng lát nữa, với bộ thuộc
              tính và số máu đang có của bạn.
            </p>

            <ul className="tien-so space-y-1.5 text-sm">
              <li className="flex items-baseline justify-between gap-2">
                <span>Trụ hết {k.soDao} đạo lôi</span>
                <b className={cn('tabular-nums', duBao.song < 0.5 ? 'tien-son' : 'tien-ngoc')}>
                  {Math.round(duBao.song * 100)}%
                </b>
              </li>
              <li className="tien-mo text-xs">
                Mỗi đạo lôi chừng {satThuongLoi(k.sucLoi, nv.suc.thu,
                  CHUAN_BI.filter((m) => chon.includes(m.ma)).reduce((s, m) => s + m.giamLoi, 0))} sát
                thương, cả {k.soDao} đạo là {duBao.tongSatThuong} — bạn đang có {nv.hp} máu.
              </li>
              <li className="flex items-baseline justify-between gap-2">
                <span>Giữ được đạo tâm</span>
                <b className={cn('tabular-nums', duBao.tam < 0.5 ? 'tien-son' : 'tien-ngoc')}>
                  {Math.round(duBao.tam * 100)}%
                </b>
              </li>
              <li className="tien-mo text-xs">
                Đạo tâm {nv.thuocTinh.daoTam ?? 0}, thần hồn {nv.thuocTinh.thanHon ?? 0}.
              </li>
              <li className="flex items-baseline justify-between gap-2 pt-1">
                <b>Qua được cả hai cửa</b>
                <b className={cn('tabular-nums text-lg', duBao.qua < 0.5 ? 'tien-son' : 'tien-ngoc')}>
                  {Math.round(duBao.qua * 100)}%
                </b>
              </li>
            </ul>

            <p className="mt-3 text-sm">
              <span className="tien-mo">Chỗ yếu hiện giờ: </span>
              {cuaYeu === 'than'
                ? <>thân thể chịu đòn. Nghỉ cho đầy máu hoặc mang <b>Hộ Thể phù</b> có lợi hơn là uống đan.</>
                : <>đạo tâm. <b>Tĩnh Tâm đan</b> vào đúng chỗ này; mua phù không giúp gì.</>}
            </p>
            <p className="tien-son mt-2 text-sm">
              Hỏng thì mất {Math.round(PHAT_DO_KIEP * 100)}% tu vi đang có
              ({Math.floor(nv.tuVi * PHAT_DO_KIEP).toLocaleString('vi')}) và linh thạch đã tiêu
              không đòi lại được. Cảnh giới thì giữ nguyên.
            </p>
          </section>

          <section className="tien-tam p-5">
            <h2 className="mb-1 text-lg font-black">Chuẩn bị</h2>
            <p className="tien-mo mb-3 text-sm">
              Trả linh thạch ngay lúc ngồi vào đàn, không có kho để cất. Đang
              có {nv.linhThach.toLocaleString('vi')} linh thạch.
            </p>
            <ul className="space-y-2">
              {CHUAN_BI.map((m) => {
                const dangChon = chon.includes(m.ma);
                return (
                  <li key={m.ma}>
                    <button type="button" aria-pressed={dangChon}
                      onClick={() => setChon((c) => c.includes(m.ma)
                        ? c.filter((x) => x !== m.ma)
                        : [...c, m.ma])}
                      className={cn('w-full p-3 text-left transition-colors',
                        dangChon ? 'tien-trieu' : 'tien-nut-vien')}>
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <b className={dangChon ? 'tien-dao-mau' : undefined}>{m.ten}</b>
                        <span className="tabular-nums">{m.gia} linh thạch</span>
                      </span>
                      <span className="tien-mo mt-1 block text-xs">{m.moTa}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Chi phí cơ hội, đúng chữ blueprint dùng ở decision card cấp 3. */}
            <p className={cn('mt-3 text-sm', duTien ? 'tien-mo' : 'tien-son')}>
              {gia === 0
                ? 'Chưa mang gì — không tốn đồng nào, và cũng không có gì đỡ.'
                : duTien
                  ? `Tiêu ${gia} linh thạch, còn lại ${(nv.linhThach - gia).toLocaleString('vi')}.`
                  : `Thiếu ${(gia - nv.linhThach).toLocaleString('vi')} linh thạch. Đi đánh quái mà kiếm.`}
            </p>
          </section>

          <button type="button" disabled={dangLam || !sanSang || !duTien}
            onClick={lam} className="tien-nut w-full px-4 py-3 text-base">
            {dangLam ? 'Đang độ kiếp…' : `Ngồi vào đàn — ${Math.round(duBao.qua * 100)}% qua`}
          </button>
        </>
      )}
    </div>
  );
}
