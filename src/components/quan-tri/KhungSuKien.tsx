'use client';

import { useActionState, useTransition } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { hienSuKien, themSuKien, xoaSuKien, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';
import { ONapAnh } from '@/components/quan-tri/ONapAnh';
import {
  LOAI_SU_KIEN, MO_TA_SU_KIEN, SU_KIEN_MO_TA_TOI_DA, SU_KIEN_TIEU_DE_TOI_DA,
  type MaLoaiSuKien,
} from '@/lib/su-kien-const';

export interface SuKienQuanTri {
  id: string;
  loai: string;
  tieuDe: string;
  moTaNgan: string;
  anh: string | null;
  batDau: string;
  ketThuc: string;
  hien: boolean;
}

/**
 * Quản lý sự kiện của một game.
 *
 * Sự kiện là thứ CÓ HẠN, nên danh sách này nói rõ cái nào còn hạn cái nào hết:
 * một trang quản trị bày mười sự kiện giống hệt nhau thì người trực không biết
 * cái nào đang thật sự hiện ngoài cửa hàng.
 */
export function KhungSuKien({ gameId, suKien }: { gameId: string; suKien: SuKienQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(themSuKien, {});
  const [dangSua, batDauSua] = useTransition();

  return (
    <div className="space-y-4">
      {suKien.length > 0 ? (
        <ul className="the divide-y divide-vien">
          {suKien.map((s) => {
            const mo = MO_TA_SU_KIEN[s.loai as MaLoaiSuKien] ?? { ten: s.loai, mau: '#475569' };
            const hetHan = new Date(s.ketThuc).getTime() < Date.now();
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden className="size-9 shrink-0 rounded-nut bg-cover"
                  style={s.anh
                    ? { backgroundImage: `url(${s.anh})` }
                    : { backgroundImage: `linear-gradient(135deg, ${mo.mau}, ${mo.mau}bb)` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{s.tieuDe}</span>
                  <span className="phu block truncate">
                    {mo.ten} · {ngayGon(s.batDau)} → {ngayGon(s.ketThuc)}
                    {hetHan && ' · đã hết hạn'}
                    {!s.hien && ' · đang tắt'}
                  </span>
                </span>

                <button type="button" disabled={dangSua}
                  onClick={() => batDauSua(async () => { await hienSuKien(s.id, !s.hien); })}
                  aria-label={`${s.hien ? 'Tắt' : 'Bật'} sự kiện ${s.tieuDe}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-nen3">
                  {s.hien ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button type="button" disabled={dangSua}
                  onClick={() => {
                    if (!window.confirm(`Gỡ sự kiện “${s.tieuDe}”?`)) return;
                    batDauSua(async () => { await xoaSuKien(s.id); });
                  }}
                  aria-label={`Gỡ sự kiện ${s.tieuDe}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-xau/10 hover:text-xau">
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="phu">
          Chưa có sự kiện nào. Đây là chỗ báo bản cập nhật lớn, giải đấu, hay dịp
          đặc biệt — thứ có hạn, hết hạn thì tự lui khỏi trang game.
        </p>
      )}

      <form action={gui} className="the space-y-3 p-4">
        <p className="text-[14px] font-bold">Thêm sự kiện</p>
        <input type="hidden" name="gameId" value={gameId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="phu mb-1 block">Loại</span>
            <select name="loai" defaultValue="CAP_NHAT_LON" className="o-nhap">
              {LOAI_SU_KIEN.map((l) => (
                <option key={l} value={l}>{MO_TA_SU_KIEN[l].ten}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="phu mb-1 block">Tiêu đề</span>
            <input name="tieuDe" required maxLength={SU_KIEN_TIEU_DE_TOI_DA}
              placeholder="Bản Việt hoá 2.0" className="o-nhap" />
          </label>
          <label className="block">
            <span className="phu mb-1 block">Bắt đầu</span>
            <input name="batDau" type="datetime-local" required className="o-nhap" />
          </label>
          <label className="block">
            <span className="phu mb-1 block">Kết thúc</span>
            <input name="ketThuc" type="datetime-local" required className="o-nhap" />
          </label>
        </div>

        <label className="block">
          <span className="phu mb-1 block">Một dòng trên thẻ</span>
          <input name="moTaNgan" required maxLength={SU_KIEN_MO_TA_TOI_DA}
            placeholder="Toàn bộ lời thoại đã dịch" className="o-nhap" />
        </label>

        <ONapAnh key={suKien.length} ten="anh" nhan="Ảnh thẻ (không bắt buộc)"
          banDau="" cho="su-kien"
          goYy="Ảnh nằm ngang, rộng ít nhất 960 điểm ảnh — thẻ cắt theo tỉ lệ 16:9.
            Bỏ trống thì thẻ dùng dải màu theo loại sự kiện." />

        <label className="block">
          <span className="phu mb-1 block">Nội dung đầy đủ (không bắt buộc)</span>
          <textarea name="noiDung" rows={4} className="o-nhap"
            placeholder="Thể lệ, mốc thời gian, phần thưởng… Viết được Markdown." />
        </label>

        {ketQua.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}

        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Thêm sự kiện'}
        </button>
      </form>
    </div>
  );
}

function ngayGon(d: string): string {
  const t = new Date(d);
  return `${t.getDate()}/${t.getMonth() + 1}`;
}
