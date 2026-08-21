'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw, X } from 'lucide-react';
import { GAME_SORTS } from '@/lib/game';
import { cn } from '@/lib/utils';

export interface FilterOption { slug: string; name: string }

export interface GameFiltersProps {
  genres: FilterOption[];
  platforms: FilterOption[];
  resolutions: FilterOption[];
  years: { min: number; max: number };
  basePath?: string;
}

const LANGUAGES: FilterOption[] = [
  { slug: 'vi', name: 'Tiếng Việt' },
  { slug: 'en', name: 'Tiếng Anh' },
  { slug: 'multi', name: 'Đa ngôn ngữ' },
];

const SIZE_STEPS: FilterOption[] = [
  { slug: '128', name: '< 128 KB' },
  { slug: '512', name: '< 512 KB' },
  { slug: '2048', name: '< 2 MB' },
  { slug: '10240', name: '< 10 MB' },
];

const UPDATED_STEPS: FilterOption[] = [
  { slug: '7', name: '7 ngày' },
  { slug: '30', name: '30 ngày' },
  { slug: '90', name: '90 ngày' },
  { slug: '365', name: '1 năm' },
];

const RATING_STEPS: FilterOption[] = [
  { slug: '3', name: '3★ trở lên' },
  { slug: '4', name: '4★ trở lên' },
  { slug: '4.5', name: '4.5★ trở lên' },
];

const PLAYS_STEPS: FilterOption[] = [
  { slug: '100', name: '100+' },
  { slug: '1000', name: '1K+' },
  { slug: '10000', name: '10K+' },
];

/**
 * Bộ lọc catalog. Mọi lựa chọn đều nằm trong query string nên link chia sẻ
 * được và trang vẫn render trên server.
 */
export function GameFilters({ genres, platforms, resolutions, years, basePath = '/games/browse' }: GameFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openMobile, setOpenMobile] = useState(false);

  const get = (k: string) => sp.get(k) ?? '';

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page'); // đổi bộ lọc thì quay về trang 1
    startTransition(() => router.push(`${basePath}?${next.toString()}`));
  };

  const toggle = (k: string, v: string) => push({ [k]: get(k) === v ? null : v });

  const activeCount = ['genre', 'platform', 'resolution', 'language', 'vi', 'online', 'yearFrom', 'yearTo', 'minRating', 'maxSizeKb', 'minPlays', 'minDownloads', 'updatedIn']
    .filter((k) => sp.get(k)).length;

  const body = (
    <div className={cn('space-y-5', pending && 'opacity-60')}>
      <Group label="Sắp xếp">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(GAME_SORTS).map(([k, label]) => (
            <Chip key={k} active={(get('sort') || 'popular') === k} onClick={() => push({ sort: k === 'popular' ? null : k })}>
              {label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group label="Thể loại">
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <Chip key={g.slug} active={get('genre') === g.slug} onClick={() => toggle('genre', g.slug)}>{g.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Dòng máy">
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <Chip key={p.slug} active={get('platform') === p.slug} onClick={() => toggle('platform', p.slug)}>{p.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Độ phân giải">
        <div className="flex flex-wrap gap-1.5">
          {resolutions.map((r) => (
            <Chip key={r.slug} active={get('resolution') === r.slug} onClick={() => toggle('resolution', r.slug)}>{r.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Ngôn ngữ">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <Chip key={l.slug} active={get('language') === l.slug} onClick={() => toggle('language', l.slug)}>{l.name}</Chip>
          ))}
          <Chip active={get('vi') === '1'} onClick={() => toggle('vi', '1')}>Đã Việt hóa</Chip>
          <Chip active={get('online') === '1'} onClick={() => toggle('online', '1')}>Chơi online</Chip>
        </div>
      </Group>

      <Group label="Năm phát hành">
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="numeric" placeholder={String(years.min)} defaultValue={get('yearFrom')}
            min={years.min} max={years.max}
            onBlur={(e) => push({ yearFrom: e.target.value })}
            className="input !py-1.5 text-sm" aria-label="Từ năm"
          />
          <span className="text-ink-400">–</span>
          <input
            type="number" inputMode="numeric" placeholder={String(years.max)} defaultValue={get('yearTo')}
            min={years.min} max={years.max}
            onBlur={(e) => push({ yearTo: e.target.value })}
            className="input !py-1.5 text-sm" aria-label="Đến năm"
          />
        </div>
      </Group>

      <Group label="Đánh giá">
        <div className="flex flex-wrap gap-1.5">
          {RATING_STEPS.map((r) => (
            <Chip key={r.slug} active={get('minRating') === r.slug} onClick={() => toggle('minRating', r.slug)}>{r.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Dung lượng">
        <div className="flex flex-wrap gap-1.5">
          {SIZE_STEPS.map((s) => (
            <Chip key={s.slug} active={get('maxSizeKb') === s.slug} onClick={() => toggle('maxSizeKb', s.slug)}>{s.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Lượt chơi">
        <div className="flex flex-wrap gap-1.5">
          {PLAYS_STEPS.map((s) => (
            <Chip key={s.slug} active={get('minPlays') === s.slug} onClick={() => toggle('minPlays', s.slug)}>{s.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Lượt tải">
        <div className="flex flex-wrap gap-1.5">
          {PLAYS_STEPS.map((s) => (
            <Chip key={s.slug} active={get('minDownloads') === s.slug} onClick={() => toggle('minDownloads', s.slug)}>{s.name}</Chip>
          ))}
        </div>
      </Group>

      <Group label="Cập nhật trong">
        <div className="flex flex-wrap gap-1.5">
          {UPDATED_STEPS.map((s) => (
            <Chip key={s.slug} active={get('updatedIn') === s.slug} onClick={() => toggle('updatedIn', s.slug)}>{s.name}</Chip>
          ))}
        </div>
      </Group>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(basePath))}
          className="btn-outline w-full !py-2 text-sm"
        >
          <RotateCcw size={14} /> Xoá {activeCount} bộ lọc
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: nút mở panel lọc */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="btn-outline w-full !py-2 text-sm lg:hidden"
      >
        <Filter size={15} /> Bộ lọc{activeCount > 0 && ` (${activeCount})`}
      </button>

      {openMobile && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-ink-900">
            <div className="mb-4 flex items-center justify-between">
              <b>Bộ lọc</b>
              <button type="button" onClick={() => setOpenMobile(false)} aria-label="Đóng" className="btn-ghost !p-1.5">
                <X size={18} />
              </button>
            </div>
            {body}
          </div>
        </div>
      )}

      <aside className="card hidden p-4 lg:block">{body}</aside>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'chip border transition-colors',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300',
      )}
    >
      {children}
    </button>
  );
}
