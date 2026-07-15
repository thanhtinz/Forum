'use client';

import { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Btn, Notice } from '@/components/admin/ui';

interface ImportSummary {
  configSettings: number; categories: number; categoryPrefixes: number;
  tags: number; permissionGroups: number; categoryPermissions: number;
}

export default function AdminBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function doExport() {
    setExporting(true);
    setMsg(null);
    try {
      const data = await api.get<any>('/admin/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = data.exportedAt?.slice(0, 10) || 'backup';
      a.href = url;
      a.download = `tram-genz-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ kind: 'success', text: 'Đã tải xuống file sao lưu ✓' });
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); }
    finally { setExporting(false); }
  }

  async function pickFile() {
    fileInput.current?.click();
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Phục hồi sẽ GHI ĐÈ cấu hình, danh mục, tiền tố, thẻ và nhóm quyền trùng khớp trong file. Tiếp tục?')) return;
    setImporting(true);
    setMsg(null);
    setSummary(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.post<{ ok: boolean; summary: ImportSummary }>('/admin/backup/import', parsed);
      setSummary(res.summary);
      setMsg({ kind: 'success', text: 'Đã phục hồi từ file sao lưu ✓' });
    } catch (e: any) {
      setMsg({ kind: 'error', text: e.message || 'File không hợp lệ' });
    } finally { setImporting(false); }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sao lưu & Phục hồi"
        desc="Xuất/nhập cấu hình site: cài đặt chung, giao diện, danh mục diễn đàn, thẻ, nhóm & phân quyền. Không bao gồm bài viết/thành viên."
        icon={<DatabaseBackup size={20} />}
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Card>
        <SectionTitle hint="Tải về 1 file JSON chứa toàn bộ cấu hình hiện tại — dùng để lưu trữ hoặc chuyển sang site khác.">
          Sao lưu
        </SectionTitle>
        <Btn onClick={doExport} disabled={exporting}>
          <Download size={15} /> {exporting ? 'Đang xuất…' : 'Tải xuống bản sao lưu (.json)'}
        </Btn>
      </Card>

      <Card>
        <SectionTitle hint="Chọn file .json đã xuất trước đó để khôi phục. Các mục trùng định danh (key/slug) sẽ bị ghi đè.">
          Phục hồi
        </SectionTitle>
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Hành động này ghi đè cấu hình đang có. Nên sao lưu trước khi phục hồi.</span>
        </div>
        <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={onFileChosen} />
        <Btn variant="outline" onClick={pickFile} disabled={importing}>
          <Upload size={15} /> {importing ? 'Đang phục hồi…' : 'Chọn file & phục hồi'}
        </Btn>

        {summary && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Cấu hình</div><div className="font-semibold">{summary.configSettings}</div></div>
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Danh mục</div><div className="font-semibold">{summary.categories}</div></div>
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Tiền tố</div><div className="font-semibold">{summary.categoryPrefixes}</div></div>
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Thẻ</div><div className="font-semibold">{summary.tags}</div></div>
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Nhóm quyền</div><div className="font-semibold">{summary.permissionGroups}</div></div>
            <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-900"><div className="text-ink-400">Ghi đè quyền danh mục</div><div className="font-semibold">{summary.categoryPermissions}</div></div>
          </div>
        )}
      </Card>
    </div>
  );
}
