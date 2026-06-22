'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EMOJIS, StickerPack } from '@/lib/chat';

// Bảng chọn emoji / sticker dùng chung cho khung bình luận.
// onEmoji: chèn ký tự emoji vào ô nhập. onSticker: gửi ngay 1 sticker (URL ảnh).
export function EmojiStickerPicker({ onEmoji, onSticker, onClose }: { onEmoji: (e: string) => void; onSticker: (url: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji');
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [activePack, setActivePack] = useState('');

  useEffect(() => {
    if (tab === 'sticker' && packs.length === 0) {
      api.get<StickerPack[]>('/chat/stickers').then((ps) => { setPacks(ps); if (ps[0]) setActivePack(ps[0].id); }).catch(() => {});
    }
  }, [tab]); // eslint-disable-line

  const p = packs.find((x) => x.id === activePack) || packs[0];
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-[320px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-lg dark:border-ink-800 dark:bg-ink-900">
      <div className="flex border-b border-ink-200/70 dark:border-ink-800">
        {(['emoji', 'sticker'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-ink-500'}`}>
            {t === 'emoji' ? 'Emoji' : 'Sticker'}
          </button>
        ))}
        <button type="button" onClick={onClose} className="px-3 text-ink-400 hover:text-ink-600">✕</button>
      </div>

      {tab === 'emoji' && (
        <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto p-3">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => onEmoji(e)} className="rounded p-1 text-xl hover:bg-ink-100 dark:hover:bg-ink-800">{e}</button>
          ))}
        </div>
      )}

      {tab === 'sticker' && (
        packs.length === 0 ? (
          <p className="p-4 text-center text-sm text-ink-400">Chưa có sticker.</p>
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-ink-100 p-1.5 dark:border-ink-800">
              {packs.map((pk) => {
                const thumb = pk.thumbnailUrl || pk.stickers[0]?.imageUrl;
                return (
                  <button key={pk.id} type="button" onClick={() => setActivePack(pk.id)} title={pk.name}
                    className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activePack === pk.id ? 'bg-brand-50 ring-1 ring-brand-300 dark:bg-ink-800' : 'hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
                    {thumb ? <img src={thumb} alt={pk.name} className="h-7 w-7 object-contain" /> : <span className="text-[10px] font-semibold">{pk.name.slice(0, 2)}</span>}
                    {!pk.isOwned && <span className="absolute -right-0.5 -top-0.5 text-[9px]">🔒</span>}
                  </button>
                );
              })}
            </div>
            {p && (
              <div className="max-h-44 overflow-y-auto p-3">
                {!p.isOwned && <p className="mb-2 text-center text-xs text-amber-600">🔒 Pack premium — cần sở hữu để gửi.</p>}
                <div className="grid grid-cols-4 gap-2">
                  {p.stickers.map((s) => (
                    <button key={s.id} type="button" disabled={!p.isOwned} onClick={() => onSticker(s.imageUrl)}
                      className="rounded-lg p-1 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800">
                      <img src={s.imageUrl} alt={s.name} className="h-14 w-14 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// Nhận diện nội dung bình luận chỉ chứa 1 ảnh/sticker để render dạng ảnh.
export const isStickerContent = (c: string) => /^https?:\/\/\S+\.(png|gif|webp|jpe?g)(\?\S*)?$/i.test(c.trim());
