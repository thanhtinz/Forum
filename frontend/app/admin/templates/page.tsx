'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';

type FieldType = 'text' | 'number' | 'boolean';
interface Field { key: string; label: string; type: FieldType }

// Các trường là ảnh — cho tải file lên thẳng thay vì dán URL
const IMAGE_KEYS = new Set(['asset', 'iconUrl', 'spriteUrl']);

const TYPES = [
  { id: 'crop', label: 'Cây trồng' },
  { id: 'fish', label: 'Cá' },
  { id: 'fishdepth', label: 'Độ sâu hồ' },
  { id: 'fishingrod', label: 'Cần câu' },
  { id: 'fishingboat', label: 'Thuyền' },
  { id: 'fertilizer', label: 'Phân bón' },
  { id: 'animal', label: 'Vật nuôi' },
  { id: 'consumable', label: 'Đồ ăn (consumable)' },
  { id: 'gempackage', label: 'Gói nạp Gem' },
];

// Khung trường cho từng loại dữ liệu game (thay vì nhập JSON thô)
const SCHEMAS: Record<string, Field[]> = {
  crop: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'seedPrice', label: 'Giá hạt (coin)', type: 'number' }, { key: 'sellPrice', label: 'Giá bán nông sản', type: 'number' },
    { key: 'growSeconds', label: 'Thời gian chín (giây)', type: 'number' }, { key: 'exp', label: 'EXP thu hoạch', type: 'number' },
    { key: 'yieldMin', label: 'Sản lượng tối thiểu', type: 'number' }, { key: 'yieldMax', label: 'Sản lượng tối đa', type: 'number' },
    { key: 'reqLevel', label: 'Cấp yêu cầu', type: 'number' }, { key: 'asset', label: 'Ảnh', type: 'text' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fish: [
    { key: 'depth', label: 'Độ sâu (cá xuất hiện)', type: 'number' }, { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'kgMin', label: 'KG tối thiểu', type: 'number' }, { key: 'kgMax', label: 'KG tối đa', type: 'number' },
    { key: 'pricePerKg', label: 'Giá / kg (coin)', type: 'number' }, { key: 'refillCount', label: 'Số con hồi/chu kỳ', type: 'number' },
    { key: 'stock', label: 'Tồn kho', type: 'number' }, { key: 'asset', label: 'Ảnh', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fishdepth: [
    { key: 'depth', label: 'Độ sâu (số, vd 1,2,3)', type: 'number' }, { key: 'name', label: 'Tên (Nông/Vừa/Sâu…)', type: 'text' },
    { key: 'minRodTier', label: 'Cần bậc tối thiểu', type: 'number' }, { key: 'catchRate', label: 'Tỷ lệ bắt được (%)', type: 'number' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fishingrod: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên cần', type: 'text' },
    { key: 'tier', label: 'Bậc cần', type: 'number' }, { key: 'price', label: 'Giá (coin)', type: 'number' },
    { key: 'asset', label: 'Ảnh', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fishingboat: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên thuyền', type: 'text' },
    { key: 'price', label: 'Giá (coin)', type: 'number' }, { key: 'capacity', label: 'Sức chứa cá', type: 'number' },
    { key: 'maxDepth', label: 'Độ sâu tối đa', type: 'number' }, { key: 'asset', label: 'Ảnh', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fertilizer: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'price', label: 'Giá (coin)', type: 'number' }, { key: 'reduceSeconds', label: 'Giảm thời gian chín (giây)', type: 'number' },
    { key: 'asset', label: 'Ảnh', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  animal: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'buyPrice', label: 'Giá mua (coin)', type: 'number' }, { key: 'growSeconds', label: 'Thời gian lớn (giây)', type: 'number' },
    { key: 'lifeSeconds', label: 'Tuổi thọ (giây)', type: 'number' }, { key: 'feedCooldownSec', label: 'Cooldown cho ăn (giây)', type: 'number' },
    { key: 'starveSeconds', label: 'Bỏ đói tối đa (giây)', type: 'number' },
    { key: 'productSlug', label: 'Mã sản phẩm', type: 'text' }, { key: 'productName', label: 'Tên sản phẩm', type: 'text' },
    { key: 'productYield', label: 'Sản lượng/lần', type: 'number' }, { key: 'productPrice', label: 'Giá sản phẩm', type: 'number' },
    { key: 'sellGrown', label: 'Bán khi lớn', type: 'number' }, { key: 'sellYoung', label: 'Bán khi non', type: 'number' },
    { key: 'asset', label: 'Ảnh', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  consumable: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'description', label: 'Mô tả', type: 'text' }, { key: 'type', label: 'Loại (FOOD/DRINK/MEDICINE...)', type: 'text' },
    { key: 'iconUrl', label: 'Icon', type: 'text' }, { key: 'spriteUrl', label: 'Sprite', type: 'text' },
    { key: 'restoreHunger', label: 'Hồi đói', type: 'number' }, { key: 'restoreThirst', label: 'Hồi khát', type: 'number' },
    { key: 'restoreHygiene', label: 'Hồi vệ sinh', type: 'number' }, { key: 'restoreEnergy', label: 'Hồi năng lượng', type: 'number' },
    { key: 'restoreHealth', label: 'Hồi máu', type: 'number' }, { key: 'curesSickness', label: 'Chữa bệnh', type: 'boolean' },
    { key: 'priceCoin', label: 'Giá (coin)', type: 'number' }, { key: 'priceGem', label: 'Giá (gem)', type: 'number' },
    { key: 'isActive', label: 'Đang bán', type: 'boolean' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  gempackage: [
    { key: 'name', label: 'Tên gói', type: 'text' }, { key: 'gemAmount', label: 'Số Gem', type: 'number' },
    { key: 'priceVnd', label: 'Giá (VND)', type: 'number' }, { key: 'priceUsd', label: 'Giá (USD)', type: 'number' },
    { key: 'bonus', label: 'Thưởng thêm', type: 'number' }, { key: 'isActive', label: 'Đang bán', type: 'boolean' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
};

// giây -> chuỗi dễ đọc (giờ/ngày)
function humanDur(sec: any): string {
  const s = Number(sec);
  if (!s || s <= 0) return '';
  if (s % 86400 === 0) return `${s / 86400} ngày`;
  if (s % 3600 === 0) return `${s / 3600} giờ`;
  if (s >= 3600) return `${(s / 3600).toFixed(1)} giờ`;
  if (s % 60 === 0) return `${s / 60} phút`;
  return `${s} giây`;
}

// chỉ số tóm tắt hiển thị ở danh sách theo loại
function rowStats(r: any, type: string): string {
  const parts: string[] = [];
  if (type === 'crop') {
    if (r.seedPrice != null) parts.push(`hạt ${r.seedPrice} coin`);
    if (r.growSeconds) parts.push(`chín ${humanDur(r.growSeconds)}`);
    if (r.yieldMin != null) parts.push(`SL ${r.yieldMin}-${r.yieldMax}`);
    if (r.sellPrice != null) parts.push(`bán ${r.sellPrice}/cái`);
  } else if (type === 'animal') {
    if (r.buyPrice != null) parts.push(`mua ${r.buyPrice} coin`);
    if (r.growSeconds) parts.push(`lớn ${humanDur(r.growSeconds)}`);
    if (r.lifeSeconds) parts.push(`thọ ${humanDur(r.lifeSeconds)}`);
    if (r.productName) parts.push(`SP ${r.productName} x${r.productYield}`);
  } else if (type === 'fish') {
    parts.push(`khu ${r.zone}`);
    if (r.pricePerKg != null) parts.push(`${r.pricePerKg} coin/kg`);
    if (r.kgMin != null) parts.push(`${r.kgMin}-${r.kgMax}kg`);
    if (r.stock != null) parts.push(`tồn ${r.stock}`);
  } else {
    if (r.priceCoin != null) parts.push(`coin ${r.priceCoin}`);
    if (r.price != null) parts.push(`${r.price} coin`);
    if (r.gemAmount != null) parts.push(`${r.gemAmount} gem`);
    if (r.slot) parts.push(r.slot);
    if (r.cookSeconds) parts.push(`nấu ${humanDur(r.cookSeconds)}`);
  }
  return parts.join(' · ');
}

export default function AdminTemplates() {
  const [type, setType] = useState('crop');
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState('');

  const fields = SCHEMAS[type] || [];

  function load() { api.get<any[]>(`/admin/templates/${type}`).then(setRows).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); setEditing(null); /* eslint-disable-next-line */ }, [type]);

  function fromRow(row: any) {
    const f: Record<string, any> = {};
    const isNew = !row?.id;
    for (const fld of fields) {
      if (row?.[fld.key] != null) { f[fld.key] = row[fld.key]; continue; }
      if (fld.type === 'boolean') {
        // Khi tạo MỚI: các cờ "đang bật/đang bán" mặc định BẬT để không bị ẩn ngoài ý muốn
        f[fld.key] = isNew && /^(isActive|active|enabled|isAvailable|available)$/i.test(fld.key);
      } else {
        f[fld.key] = '';
      }
    }
    return f;
  }
  function openEdit(row: any) { setEditing(row); setForm(fromRow(row)); setMsg(''); }
  function openNew() { setEditing({}); setForm(fromRow({})); setMsg(''); }

  async function save() {
    const data: Record<string, any> = {};
    for (const fld of fields) {
      const v = form[fld.key];
      if (fld.type === 'number') data[fld.key] = v === '' || v == null ? null : Number(v);
      else if (fld.type === 'boolean') data[fld.key] = !!v;
      else data[fld.key] = v ?? '';
    }
    try {
      if (editing?.id) await api.patch(`/admin/templates/${type}/${editing.id}`, data);
      else await api.post(`/admin/templates/${type}`, data);
      setMsg('Đã lưu'); setEditing(null);
    } catch (e: any) { setMsg(e.message); }
    load();
  }
  async function del(id: string) {
    if (!confirm('Xóa mục này?')) return;
    try { await api.del(`/admin/templates/${type}/${id}`); setMsg('Đã xóa'); } catch (e: any) { setMsg(e.message); }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dữ liệu game</h1>
        <button onClick={openNew} className="btn-primary text-xs">+ Thêm mới</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} className={`rounded-lg px-3 py-1.5 text-sm ${type === t.id ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {editing && (
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">{editing.id ? 'Sửa' : 'Thêm'} · {TYPES.find((t) => t.id === type)?.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f.key} className="block text-sm">
                {f.type === 'boolean' ? (
                  <span className="flex items-center gap-2 pt-5">
                    <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                    {f.label}
                  </span>
                ) : IMAGE_KEYS.has(f.key) ? (
                  <>
                    <span className="text-ink-500">{f.label}</span>
                    <div className="mt-1">
                      <ImageUpload value={form[f.key] || ''} onUploaded={(url) => setForm({ ...form, [f.key]: url })} />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-ink-500">{f.label}</span>
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      className="input mt-1"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                    {/^[a-z]+Seconds$/.test(f.key) && humanDur(form[f.key]) && <span className="mt-0.5 block text-[11px] text-emerald-600">= {humanDur(form[f.key])}</span>}
                  </>
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">Lưu</button>
            <button onClick={() => setEditing(null)} className="btn-outline">Hủy</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 text-sm">
            <div className="min-w-0">
              <b>{r.name || r.slug}</b> {r.slug && <span className="text-ink-400">/{r.slug}</span>}
              {r.isActive === false && <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-950/40">Đang ẩn</span>}
              <div className="text-xs text-ink-400">{rowStats(r, type)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(r)} className="btn-outline !py-1 text-xs">Sửa</button>
              <button onClick={() => del(r.id)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-ink-500">Không có dữ liệu.</div>}
      </div>
    </div>
  );
}
