'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette, GripVertical, Save, Code2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Btn, Notice, Toggle } from '@/components/admin/ui';
import { generateBrandRampHex, isValidHex, BRAND_SHADES } from '@/lib/colorRamp';
import { DEFAULT_HOME_WIDGETS, HomeWidget } from '@/lib/siteConfig';

interface Setting { key: string; value: any }
interface Group { key: string; settings: Setting[] }

export default function AdminAppearance() {
  const [primaryColor, setPrimaryColor] = useState('#2e5a80');
  const [customCss, setCustomCss] = useState('');
  const [widgets, setWidgets] = useState<HomeWidget[]>(DEFAULT_HOME_WIDGETS);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    api.get<Group[]>('/admin/config').then((groups) => {
      const g = groups.find((x) => x.key === 'appearance');
      const find = (k: string) => g?.settings.find((s) => s.key === k)?.value;
      const color = find('site.primaryColor');
      const css = find('site.customCss');
      const w = find('site.homeWidgets');
      if (typeof color === 'string' && color) setPrimaryColor(color);
      if (typeof css === 'string') setCustomCss(css);
      if (Array.isArray(w) && w.length) setWidgets(w);
    }).catch((e) => setMsg(e.message)).finally(() => setLoading(false));
  }, []);

  async function saveTheme() {
    setSavingTheme(true);
    try {
      await api.patch('/admin/config/setting/site.primaryColor', { value: primaryColor });
      await api.patch('/admin/config/setting/site.customCss', { value: customCss });
      setMsg('Đã lưu giao diện ✓');
    } catch (e: any) { setMsg(e.message); }
    finally { setSavingTheme(false); }
  }

  async function saveWidgets() {
    setSavingWidgets(true);
    try {
      await api.patch('/admin/config/setting/site.homeWidgets', { value: widgets });
      setMsg('Đã lưu sắp xếp widget ✓');
    } catch (e: any) { setMsg(e.message); }
    finally { setSavingWidgets(false); }
  }

  function toggleWidget(key: string) {
    setWidgets((ws) => ws.map((w) => (w.key === key ? { ...w, enabled: !w.enabled } : w)));
  }

  function onDrop(targetIndex: number) {
    const from = dragIndex.current;
    setDragOverIndex(null);
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setWidgets((ws) => {
      const next = [...ws];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  const ramp = isValidHex(primaryColor) ? generateBrandRampHex(primaryColor) : null;

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giao diện"
        desc="Màu chủ đạo, CSS tuỳ chỉnh, sắp xếp widget trang chủ — áp dụng ngay, không cần build lại."
        icon={<Palette size={20} />}
      />
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card>
        <SectionTitle hint="Đổi 1 màu, cả bảng màu (nút, viền, chữ nhấn) tự sinh theo — giữ đúng độ tương phản như thiết kế gốc.">
          Màu chủ đạo
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <input type="color" className="h-10 w-14 rounded border border-ink-200 dark:border-ink-700" value={isValidHex(primaryColor) ? primaryColor : '#2e5a80'} onChange={(e) => setPrimaryColor(e.target.value)} />
          <input className="input max-w-[140px]" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2e5a80" />
        </div>
        {ramp && (
          <div className="mt-3 flex overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
            {BRAND_SHADES.map((sh) => (
              <div key={sh} className="h-9 flex-1" style={{ backgroundColor: ramp[sh] }} title={`${sh}: ${ramp[sh]}`} />
            ))}
          </div>
        )}
        {!ramp && primaryColor && <p className="mt-2 text-xs text-rose-500">Mã màu không hợp lệ (vd: #2e5a80).</p>}

        <div className="mt-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Code2 size={14} /> CSS tuỳ chỉnh (nâng cao)</label>
          <textarea
            className="input resize-y font-mono text-xs"
            rows={6}
            placeholder=".card { border-radius: 4px; }"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-400">Chèn thẳng vào &lt;head&gt; toàn site — dùng cho tinh chỉnh nhỏ, cẩn thận với CSS không hợp lệ.</p>
        </div>

        <div className="mt-4">
          <Btn onClick={saveTheme} disabled={savingTheme}><Save size={15} /> {savingTheme ? 'Đang lưu…' : 'Lưu giao diện'}</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Kéo-thả để đổi thứ tự, bật/tắt để ẩn hiện. Áp dụng cho cột phải trang chủ.">
          Widget trang chủ
        </SectionTitle>
        <div className="space-y-1.5">
          {widgets.map((w, i) => (
            <div
              key={w.key}
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
              onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
              onDrop={() => onDrop(i)}
              onDragEnd={() => { dragIndex.current = null; setDragOverIndex(null); }}
              className={`flex items-center gap-3 rounded-lg border p-2.5 transition ${
                dragOverIndex === i ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-800'
              } ${w.enabled ? '' : 'opacity-50'}`}
            >
              <GripVertical size={16} className="shrink-0 cursor-grab text-ink-400" />
              <span className="flex-1 text-sm font-medium">{w.label}</span>
              <Toggle checked={w.enabled} onChange={() => toggleWidget(w.key)} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Btn onClick={saveWidgets} disabled={savingWidgets}><Save size={15} /> {savingWidgets ? 'Đang lưu…' : 'Lưu sắp xếp'}</Btn>
        </div>
      </Card>
    </div>
  );
}
