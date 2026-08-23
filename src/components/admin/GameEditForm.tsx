'use client';

import { useActionState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { updateGame, type ActionState } from '@/app/admin/games/actions';

export interface Option { id: string; name: string }

export interface GameEditFormProps {
  game: {
    id: string; slug: string; title: string; titleVi: string | null; series: string | null;
    description: string | null; gameplay: string | null; icon: string | null; cover: string | null;
    trailerUrl: string | null; developer: string | null; publisher: string | null;
    releaseYear: number | null; language: string; vietnamized: boolean; featured: boolean;
    status: string; platformId: string | null; resolutionId: string | null;
    compatibilityNote: string | null; knownIssues: string | null;
    controls: unknown;
  };
  genres: Option[];
  selectedGenreIds: string[];
  platforms: Option[];
  resolutions: Option[];
  tags: string;
}

const STATUSES = [
  ['DRAFT', 'Nháp'], ['PENDING', 'Chờ duyệt'], ['PUBLISHED', 'Đã đăng'], ['ARCHIVED', 'Lưu trữ'],
] as const;

/** Form thông tin chính của game trong khu quản trị. */
export function GameEditForm({ game, genres, selectedGenreIds, platforms, resolutions, tags }: GameEditFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateGame, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={game.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên game *"><input name="title" required defaultValue={game.title} className="input" /></Field>
        <Field label="Tên Việt hóa"><input name="titleVi" defaultValue={game.titleVi ?? ''} className="input" /></Field>
        <Field label="Slug"><input name="slug" defaultValue={game.slug} className="input" /></Field>
        <Field label="Series"><input name="series" defaultValue={game.series ?? ''} className="input" /></Field>
        <Field label="Developer"><input name="developer" defaultValue={game.developer ?? ''} className="input" /></Field>
        <Field label="Publisher"><input name="publisher" defaultValue={game.publisher ?? ''} className="input" /></Field>
        <Field label="Năm phát hành"><input name="releaseYear" type="number" defaultValue={game.releaseYear ?? ''} className="input" /></Field>
        <Field label="Ngôn ngữ">
          <select name="language" defaultValue={game.language} className="input">
            <option value="en">Tiếng Anh</option>
            <option value="vi">Tiếng Việt</option>
            <option value="multi">Đa ngôn ngữ</option>
          </select>
        </Field>
        <Field label="Icon (storage key / URL)"><input name="icon" defaultValue={game.icon ?? ''} className="input" /></Field>
        <Field label="Ảnh bìa"><input name="cover" defaultValue={game.cover ?? ''} className="input" /></Field>
        <Field label="Trailer (URL nhúng)"><input name="trailerUrl" defaultValue={game.trailerUrl ?? ''} className="input" /></Field>
        <Field label="Trạng thái">
          <select name="status" defaultValue={game.status} className="input">
            {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Platform">
          <select name="platformId" defaultValue={game.platformId ?? ''} className="input">
            <option value="">— Không đặt —</option>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Độ phân giải">
          <select name="resolutionId" defaultValue={game.resolutionId ?? ''} className="input">
            <option value="">— Không đặt —</option>
            {resolutions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Tag (phân tách bằng dấu phẩy)"><input name="tags" defaultValue={tags} className="input" /></Field>
      </div>

      <Field label="Thể loại">
        <div className="flex flex-wrap gap-2 rounded-lg border border-ink-200 p-3 dark:border-ink-700">
          {genres.map((g) => (
            <label key={g.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="genres" value={g.id} defaultChecked={selectedGenreIds.includes(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap gap-5">
        <Toggle label="Bản Việt hóa" name="vietnamized" defaultChecked={game.vietnamized} />
        <Toggle label="Nổi bật" name="featured" defaultChecked={game.featured} />
      </div>

      <Field label="Mô tả"><textarea name="description" rows={4} defaultValue={game.description ?? ''} className="input" /></Field>
      <Field label="Lối chơi"><textarea name="gameplay" rows={3} defaultValue={game.gameplay ?? ''} className="input" /></Field>
      <Field label="Ghi chú tương thích"><textarea name="compatibilityNote" rows={2} defaultValue={game.compatibilityNote ?? ''} className="input" /></Field>
      <Field label="Lỗi đã biết"><textarea name="knownIssues" rows={2} defaultValue={game.knownIssues ?? ''} className="input" /></Field>
      <Field label='Controls (JSON: [{"key":"5","action":"Bắn"}])'>
        <textarea name="controls" rows={3} defaultValue={game.controls ? JSON.stringify(game.controls) : ''} className="input font-mono text-xs" />
      </Field>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Đã lưu.</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} /> {label}
    </label>
  );
}
