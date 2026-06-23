'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, Upload, Trash2, CheckCircle, GripVertical, FileArchive, X, Image, AlignLeft } from 'lucide-react';
import { unzipSync } from 'fflate';
import { api, postFiles } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, SectionTitle, Btn, Field, Notice } from '@/components/admin/ui';
import TipTapEditor from '@/components/TipTapEditor';

// A local page entry (before upload)
interface LocalPage {
  uid: string;
  file: File;
  preview: string;
}

// A server page entry (after upload)
type ServerPages = string[]; // array of URLs in order

function ChapterEditorInner() {
  const params = useSearchParams();
  const mediaId = params.get('mediaId') ?? '';
  const chapterId = params.get('chapterId') ?? '';
  const isNew = !chapterId;

  const { user, loading: authLoading } = useAuth();

  // Chapter type: 'image' | 'text'
  const [chapterType, setChapterType] = useState<'image' | 'text'>('image');
  // Chapter metadata
  const [chapForm, setChapForm] = useState({ number: '', title: '', volume: '' });
  // Text content for text-type chapters
  const [textContent, setTextContent] = useState('');
  // Local files waiting to be uploaded
  const [localPages, setLocalPages] = useState<LocalPage[]>([]);
  // Pages already on server
  const [serverPages, setServerPages] = useState<ServerPages>([]);
  // Drag-drop reorder state
  const dragIdx = useRef<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [resolvedChapterId, setResolvedChapterId] = useState(chapterId);
  const [loading, setLoading] = useState(!isNew);

  // Load existing chapter if editing
  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    api
      .get<any>(`/creator/chapter/${chapterId}`)
      .then((ch) => {
        setChapForm({ number: String(ch.number), title: ch.title ?? '', volume: ch.volume ? String(ch.volume) : '' });
        setServerPages(ch.pages ?? []);
        setResolvedChapterId(chapterId);
        if (ch.content) { setTextContent(ch.content); setChapterType('text'); }
      })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapterId]);

  function setField(k: keyof typeof chapForm, v: string) { setChapForm((f) => ({ ...f, [k]: v })); }

  // ── File / ZIP handling ──────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const newPages: LocalPage[] = [];
    const zipFiles: File[] = [];
    for (const f of Array.from(files)) {
      if (/\.(cbz|zip)$/i.test(f.name)) { zipFiles.push(f); continue; }
      if (/\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)) {
        newPages.push({ uid: `${Date.now()}-${Math.random()}`, file: f, preview: URL.createObjectURL(f) });
      }
    }
    if (newPages.length) setLocalPages((prev) => [...prev, ...newPages]);
    zipFiles.forEach(extractZip);
  }

  async function extractZip(zipFile: File) {
    try {
      const buf = await zipFile.arrayBuffer();
      const entries = unzipSync(new Uint8Array(buf));
      const imageEntries = Object.entries(entries).filter(([name]) =>
        /\.(jpe?g|png|gif|webp)$/i.test(name)
      );
      imageEntries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
      const newPages: LocalPage[] = imageEntries.map(([name, data]) => {
        const parts = name.split('/');
        const filename = parts[parts.length - 1];
        const mime = /\.png$/i.test(filename) ? 'image/png'
          : /\.(gif)$/i.test(filename) ? 'image/gif'
          : /\.(webp)$/i.test(filename) ? 'image/webp'
          : 'image/jpeg';
        const blob = new Blob([data], { type: mime });
        const file = new File([blob], filename, { type: mime });
        return { uid: `${Date.now()}-${Math.random()}-${filename}`, file, preview: URL.createObjectURL(blob) };
      });
      setLocalPages((prev) => [...prev, ...newPages]);
      setMsg(`Đã giải nén ${newPages.length} trang từ ${zipFile.name}`);
    } catch (e: any) { setErr(`Lỗi giải nén ${zipFile.name}: ${e.message}`); }
  }

  // ── Drag-drop zone ───────────────────────────────────────────────────────

  const onZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  // ── Page list drag-to-reorder ────────────────────────────────────────────

  function reorderLocal(from: number, to: number) {
    setLocalPages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function reorderServer(from: number, to: number) {
    setServerPages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function removeLocal(uid: string) {
    setLocalPages((prev) => prev.filter((p) => p.uid !== uid));
  }

  function removeServerPage(idx: number) {
    setServerPages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Save / upload ────────────────────────────────────────────────────────

  async function ensureChapter(): Promise<string> {
    const meta = {
      number: Number(chapForm.number),
      title: chapForm.title || undefined,
      volume: chapForm.volume ? Number(chapForm.volume) : undefined,
    };
    if (resolvedChapterId) {
      await api.patch(`/creator/chapter/${resolvedChapterId}`, meta);
      return resolvedChapterId;
    }
    if (!mediaId) throw new Error('Thiếu mediaId');
    if (!chapForm.number) throw new Error('Nhập số chương');
    const ch = await api.post<{ id: string }>(`/creator/manga/${mediaId}/chapters`, meta);
    setResolvedChapterId(ch.id);
    return ch.id;
  }

  async function save() {
    if (!chapForm.number) { setErr('Nhập số chương'); return; }
    if (chapterType === 'text' && !textContent.trim()) { setErr('Nhập nội dung chương'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const cid = await ensureChapter();

      if (chapterType === 'text') {
        await api.patch(`/creator/chapter/${cid}`, { content: textContent });
      } else {
        // Upload new local pages
        if (localPages.length > 0) {
          setUploading(true);
          const files = localPages.map((p) => p.file);
          const result = await postFiles<{ id: string; pages: string[] }>(
            `/creator/chapter/${cid}/pages`,
            files,
            'files',
          );
          const newUrls = result.pages.slice(-(files.length));
          const merged = [...serverPages, ...newUrls];
          setServerPages(merged);
          setLocalPages([]);
          setUploading(false);
          await api.post(`/creator/chapter/${cid}/pages/order`, { pages: merged });
        } else if (serverPages.length > 0) {
          await api.post(`/creator/chapter/${cid}/pages/order`, { pages: serverPages });
        }
      }

      setMsg('Đã lưu ✓');
    } catch (e: any) { setErr(e.message); setUploading(false); } finally { setBusy(false); }
  }

  async function publish() {
    if (!resolvedChapterId) { setErr('Lưu chương trước khi xuất bản'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.post(`/creator/chapter/${resolvedChapterId}/publish`);
      setMsg('Đã gửi kiểm duyệt / xuất bản ✓');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (authLoading || loading) return <div className="p-10 text-center text-ink-400">Đang tải...</div>;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;

  const backHref = mediaId ? `/manga/creator/edit?id=${mediaId}` : '/manga/creator';
  const totalPages = serverPages.length + localPages.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href={backHref} className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <PageHeader
          icon={<BookOpen size={20} />}
          title={isNew ? 'Thêm chương mới' : `Chỉnh sửa chương ${chapForm.number}`}
        />
      </div>

      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Chapter info */}
      <Card>
        <SectionTitle>Thông tin chương</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Số chương *">
            <input
              type="number"
              min={0}
              step={0.1}
              value={chapForm.number}
              onChange={(e) => setField('number', e.target.value)}
              className="input w-full"
              placeholder="1"
            />
          </Field>
          <Field label="Volume (tuỳ chọn)">
            <input
              type="number"
              min={1}
              value={chapForm.volume}
              onChange={(e) => setField('volume', e.target.value)}
              className="input w-full"
              placeholder="1"
            />
          </Field>
          <Field label="Tiêu đề (tuỳ chọn)">
            <input
              value={chapForm.title}
              onChange={(e) => setField('title', e.target.value)}
              className="input w-full"
              placeholder="Tiêu đề chương..."
            />
          </Field>
        </div>
      </Card>

      {/* Chapter type toggle */}
      <Card>
        <SectionTitle>Loại chương</SectionTitle>
        <div className="flex gap-3">
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${chapterType === 'image' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
            <input type="radio" name="chtype" checked={chapterType === 'image'} onChange={() => setChapterType('image')} className="hidden" />
            <Image size={18} className={chapterType === 'image' ? 'text-brand-600' : 'text-ink-400'} />
            <div>
              <p className="text-sm font-medium">Truyện tranh</p>
              <p className="text-xs text-ink-400">Upload ảnh trang, ZIP / CBZ</p>
            </div>
          </label>
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${chapterType === 'text' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
            <input type="radio" name="chtype" checked={chapterType === 'text'} onChange={() => setChapterType('text')} className="hidden" />
            <AlignLeft size={18} className={chapterType === 'text' ? 'text-brand-600' : 'text-ink-400'} />
            <div>
              <p className="text-sm font-medium">Truyện chữ</p>
              <p className="text-xs text-ink-400">Light novel, truyện văn xuôi</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Text content (for text chapters) */}
      {chapterType === 'text' && (
        <Card>
          <SectionTitle hint="Nội dung chương (hỗ trợ định dạng)">Nội dung chương</SectionTitle>
          <TipTapEditor
            value={textContent}
            onChange={setTextContent}
            placeholder="Viết nội dung chương tại đây..."
          />
        </Card>
      )}

      {/* Upload zone (for image chapters) */}
      {chapterType === 'image' && (
      <Card>
        <SectionTitle hint="Chọn file ảnh hoặc kéo thả vào đây. Hỗ trợ ZIP / CBZ.">
          Tải trang lên
        </SectionTitle>

        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-ink-700 dark:bg-ink-900/50 dark:hover:border-brand-600"
          onDrop={onZoneDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('page-file-input')?.click()}
        >
          <Upload size={32} className="text-ink-300" />
          <div>
            <p className="font-medium text-ink-600 dark:text-ink-300">Kéo ảnh vào đây hoặc nhấn để chọn</p>
            <p className="mt-1 text-xs text-ink-400">JPG, PNG, WebP — hoặc file ZIP / CBZ</p>
          </div>
          <input
            id="page-file-input"
            type="file"
            multiple
            accept="image/*,.zip,.cbz"
            className="hidden"
            onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
          />
        </div>

        {localPages.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
            <span>{localPages.length} trang chờ tải lên</span>
            <button onClick={() => setLocalPages([])} className="text-rose-500 hover:underline">Xoá tất cả</button>
          </div>
        )}
      </Card>
      )}

      {/* Page list */}
      {chapterType === 'image' && totalPages > 0 && (
        <Card>
          <SectionTitle hint="Kéo để sắp xếp lại thứ tự trang">
            Danh sách trang ({totalPages})
          </SectionTitle>

          <div className="space-y-1">
            {/* Server pages */}
            {serverPages.map((url, idx) => (
              <div
                key={url}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-ink-100 bg-white px-2 py-1.5 dark:border-ink-800 dark:bg-ink-900"
                draggable
                onDragStart={() => { dragIdx.current = idx; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx.current !== null && dragIdx.current !== idx) {
                    reorderServer(dragIdx.current, idx);
                    dragIdx.current = idx;
                  }
                }}
                onDragEnd={() => { dragIdx.current = null; }}
              >
                <GripVertical size={14} className="shrink-0 text-ink-300" />
                <span className="w-6 shrink-0 text-center text-xs text-ink-400">{idx + 1}</span>
                <img src={url} alt="" className="h-12 w-8 rounded object-cover" />
                <span className="flex-1 truncate text-xs text-ink-500">{url.split('/').pop()}</span>
                <button onClick={() => removeServerPage(idx)} className="text-ink-300 hover:text-rose-500">
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Local pages (pending upload) */}
            {localPages.map((p, idx) => (
              <div
                key={p.uid}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-2 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/20"
                draggable
                onDragStart={() => { dragIdx.current = serverPages.length + idx; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIdx.current;
                  const to = serverPages.length + idx;
                  if (from !== null && from !== to) {
                    const localFrom = from - serverPages.length;
                    if (localFrom >= 0) reorderLocal(localFrom, idx);
                    dragIdx.current = to;
                  }
                }}
                onDragEnd={() => { dragIdx.current = null; }}
              >
                <GripVertical size={14} className="shrink-0 text-ink-300" />
                <span className="w-6 shrink-0 text-center text-xs text-ink-400">{serverPages.length + idx + 1}</span>
                <img src={p.preview} alt="" className="h-12 w-8 rounded object-cover" />
                <span className="flex-1 truncate text-xs text-ink-500">{p.file.name}</span>
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">chờ tải</span>
                <button onClick={() => removeLocal(p.uid)} className="text-ink-300 hover:text-rose-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3 pb-8">
        <Link href={backHref}><Btn variant="outline">Quay lại</Btn></Link>
        <Btn onClick={save} disabled={busy || uploading}>
          {uploading ? 'Đang tải lên...' : busy ? 'Đang lưu...' : 'Lưu chương'}
        </Btn>
        {resolvedChapterId && (
          <Btn variant="outline" onClick={publish} disabled={busy}>
            <CheckCircle size={14} /> Xuất bản
          </Btn>
        )}
      </div>
    </div>
  );
}

export default function ChapterEditorPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-400">Đang tải...</div>}>
      <ChapterEditorInner />
    </Suspense>
  );
}
