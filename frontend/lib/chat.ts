// Bộ emoji gọn cho bảng chọn (không cần thư viện ngoài)
export const EMOJIS: string[] = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳','😇','🙂','😉','😌','😋','😜',
  '🤔','🤨','😐','😴','😢','😭','😤','😡','🤯','😱','😳','🥺','😬','🙄','😮','😏',
  '👍','👎','👌','✌️','🤞','🙏','👏','🙌','💪','🤝','👋','🤙','☝️','✋','🤘','🫶',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','🔥','⭐','✨','🎉','🎁','🏆',
  '😺','🐶','🐱','🐼','🦊','🐸','🐵','🦁','🐯','🐰','🐻','🐷','🦄','🐲','🍀','🌹',
  '🍕','🍔','🍟','🍜','🍣','🍰','☕','🍺','🥤','🍎','🍉','🍓','⚽','🎮','🎵','💰',
];

export interface ChatUser { id: string; username: string; displayName?: string | null; avatar?: string | null; role?: string | null; verifiedBadge?: boolean | null; nameEffectCss?: string | null; chatBubbleCss?: string | null }
export interface ChatMsg {
  id: string;
  channelId: string;
  senderId: string;
  type: 'TEXT' | 'EMOJI' | 'STICKER' | 'GIF' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'MUSIC';
  content: string;
  metadata?: any;
  replyToId?: string | null;
  replyTo?: { id: string; content: string; type: string; senderId: string; sender?: ChatUser | null } | null;
  sender?: ChatUser | null;
  createdAt: string;
}
export interface ChatChannel {
  id: string;
  type: 'GLOBAL' | 'PRIVATE' | 'GROUP' | 'GUILD';
  title: string;
  avatarUrl?: string | null;
  memberCount?: number;
  pinned?: boolean;
  lastMessage?: ChatMsg | null;
}
export interface StickerPack {
  id: string; name: string; isOwned: boolean; thumbnailUrl?: string | null;
  stickers: { id: string; name: string; imageUrl: string }[];
}

// Tìm GIF qua backend (admin cấu hình Giphy/Tenor + API key).
// Trả { configured, results }: configured=false nghĩa là admin chưa nhập API key → UI cho dán link.
export interface GifResult { id: string; url: string; preview: string }
export async function searchGifs(q: string): Promise<{ configured: boolean; results: GifResult[] }> {
  try {
    const { api } = await import('./api');
    return await api.get<{ configured: boolean; results: GifResult[] }>(`/chat/gifs?q=${encodeURIComponent(q.trim())}`);
  } catch {
    return { configured: false, results: [] };
  }
}

export function musicEmbed(url: string, provider?: string): { kind: 'iframe' | 'audio'; src: string } | null {
  const p = provider || '';
  if (p === 'youtube' || /youtube\.com|youtu\.be/.test(url)) {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
    if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (p === 'spotify' || /spotify\.com/.test(url)) {
    const m = url.match(/spotify\.com\/(track|album|playlist)\/([\w]+)/);
    if (m) return { kind: 'iframe', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
  }
  if (p === 'soundcloud' || /soundcloud\.com/.test(url)) {
    return { kind: 'iframe', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&visual=false` };
  }
  if (p === 'mp3' || /\.mp3($|\?)/.test(url)) return { kind: 'audio', src: url };
  return null;
}
