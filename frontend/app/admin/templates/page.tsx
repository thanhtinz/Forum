'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type FieldType = 'text' | 'number' | 'boolean';
interface Field { key: string; label: string; type: FieldType }

const TYPES = [
  { id: 'crop', label: 'Cây trồng' },
  { id: 'fish', label: 'Cá' },
  { id: 'fertilizer', label: 'Phân bón' },
  { id: 'animal', label: 'Vật nuôi' },
  { id: 'recipe', label: 'Công thức' },
  { id: 'avatar', label: 'Wardrobe/Pet/Mount' },
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
    { key: 'reqLevel', label: 'Cấp yêu cầu', type: 'number' }, { key: 'asset', label: 'Ảnh (URL)', type: 'text' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fish: [
    { key: 'zone', label: 'Khu (1-3)', type: 'number' }, { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'kgMin', label: 'KG tối thiểu', type: 'number' }, { key: 'kgMax', label: 'KG tối đa', type: 'number' },
    { key: 'pricePerKg', label: 'Giá / kg (coin)', type: 'number' }, { key: 'refillCount', label: 'Số con hồi/chu kỳ', type: 'number' },
    { key: 'stock', label: 'Tồn kho', type: 'number' }, { key: 'asset', label: 'Ảnh (URL)', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  fertilizer: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'price', label: 'Giá (coin)', type: 'number' }, { key: 'reduceSeconds', label: 'Giảm thời gian chín (giây)', type: 'number' },
    { key: 'asset', label: 'Ảnh (URL)', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  animal: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'buyPrice', label: 'Giá mua (coin)', type: 'number' }, { key: 'growSeconds', label: 'Thời gian lớn (giây)', type: 'number' },
    { key: 'lifeSeconds', label: 'Tuổi thọ (giây)', type: 'number' }, { key: 'feedCooldownSec', label: 'Cooldown cho ăn (giây)', type: 'number' },
    { key: 'starveSeconds', label: 'Bỏ đói tối đa (giây)', type: 'number' },
    { key: 'productSlug', label: 'Mã sản phẩm', type: 'text' }, { key: 'productName', label: 'Tên sản phẩm', type: 'text' },
    { key: 'productYield', label: 'Sản lượng/lần', type: 'number' }, { key: 'productPrice', label: 'Giá sản phẩm', type: 'number' },
    { key: 'sellGrown', label: 'Bán khi lớn', type: 'number' }, { key: 'sellYoung', label: 'Bán khi non', type: 'number' },
    { key: 'asset', label: 'Ảnh (URL)', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  recipe: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'cookSeconds', label: 'Thời gian nấu (giây)', type: 'number' }, { key: 'reward', label: 'Phần thưởng (coin)', type: 'number' },
    { key: 'skillExp', label: 'EXP để học', type: 'number' }, { key: 'needSkill', label: 'Cần học kỹ năng', type: 'boolean' },
    { key: 'reqLevel', label: 'Cấp yêu cầu', type: 'number' }, { key: 'asset', label: 'Ảnh (URL)', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  avatar: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'slot', label: 'Slot (HAIR/CLOTHES/PET/MOUNT...)', type: 'text' }, { key: 'gender', label: 'Giới tính (0 chung,1 nam,2 nữ)', type: 'number' },
    { key: 'priceCoin', label: 'Giá (coin)', type: 'number' }, { key: 'reqLevel', label: 'Cấp yêu cầu', type: 'number' },
    { key: 'expiredDay', label: 'Số ngày (0 = vĩnh viễn)', type: 'number' }, { key: 'zorder', label: 'Lớp vẽ (zorder)', type: 'number' },
    { key: 'asset', label: 'Ảnh (URL)', type: 'text' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  consumable: [
    { key: 'slug', label: 'Mã (slug)', type: 'text' }, { key: 'name', label: 'Tên', type: 'text' },
    { key: 'description', label: 'Mô tả', type: 'text' }, { key: 'type', label: 'Loại (FOOD/DRINK/MEDICINE...)', type: 'text' },
    { key: 'iconUrl', label: 'Icon (URL)', type: 'text' }, { key: 'spriteUrl', label: 'Sprite (URL)', type: 'text' },
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
    for (const fld of fields) f[fld.key] = row?.[fld.key] ?? (fld.type === 'boolean' ? false : '');
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
                ) : (
                  <>
                    <span className="text-ink-500">{f.label}</span>
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      className="input mt-1"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  </>
                )}
              </label>
            ))}
          </div>
          {type === 'recipe' && <p className="mt-2 text-xs text-ink-400">Nguyên liệu công thức được quản lý qua dữ liệu seed.</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">Lưu</button>
            <button onClick={() => setEditing(null)} className="btn-outline">Hủy</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <b>{r.name || r.slug}</b> <span className="text-ink-400">/{r.slug}</span>
              <span className="ml-2 text-xs text-ink-400">
                {r.priceCoin != null && `coin ${r.priceCoin}`}{r.seedPrice != null && `hạt ${r.seedPrice}`}{r.buyPrice != null && `mua ${r.buyPrice}`}{r.pricePerKg != null && `${r.pricePerKg}/kg`}{r.gemAmount != null && `${r.gemAmount} gem`}{r.slot && ` · ${r.slot}`}
              </span>
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
