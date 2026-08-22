/** Bộ emoji dựng sẵn, nhóm theo chủ đề — không phụ thuộc thư viện ngoài. */
export const EMOJI_GROUPS: { key: string; label: string; icon: string; items: string[] }[] = [
  {
    key: 'smiley', label: 'Mặt cười', icon: '😀',
    items: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤨','😐','😑',
      '😶','😏','😒','🙄','😬','😮','😯','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢',
      '🤧','😷','🤒','🤕','🥳','🥺','😢','😭','😤','😠','😡','🤬','😳','😱','😨','😰',
    ],
  },
  {
    key: 'gesture', label: 'Cử chỉ', icon: '👍',
    items: [
      '👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚',
      '🖐️','🖖','👋','🤝','🙏','✍️','💪','🦾','👏','🙌','👐','🤲','🫶','❤️','🧡','💛',
      '💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐',
    ],
  },
  {
    key: 'object', label: 'Đồ vật', icon: '💡',
    items: [
      '🔥','💯','✅','❌','⚠️','❓','❗','💡','📌','📎','📁','📂','📄','📝','✏️','🖊️',
      '💻','🖥️','⌨️','🖱️','📱','☎️','📷','🎥','🎬','🎮','🕹️','🎧','🎵','🎁','🏆','🥇',
      '🎯','🔔','🔒','🔓','🔑','🔧','🔨','⚙️','🧩','📊','📈','📉','💰','💳','🛒','🎉',
    ],
  },
  {
    key: 'nature', label: 'Thiên nhiên', icon: '🌿',
    items: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔',
      '🐧','🐦','🦆','🦉','🦄','🐝','🦋','🐢','🐙','🐳','🌸','🌼','🌻','🌹','🌷','🌱',
      '🌿','🍀','🌳','🌵','☀️','🌤️','☁️','🌧️','⛈️','❄️','🌈','🌙','⚡','🍎','🍕','☕',
    ],
  },
];

export interface StickerPack {
  key: string;
  label: string;
  /** Đường dẫn tới các tệp sticker trong /public/stickers */
  items: { id: string; src: string; alt: string }[];
}

const CAT = [
  ['meo-chao','Xin chào'],['meo-vui','Vui quá'],['meo-yeu','Thích lắm'],['meo-buon','Buồn'],
  ['meo-khoc','Khóc'],['meo-gian','Giận'],['meo-ngu','Buồn ngủ'],['meo-soc','Sốc'],
  ['meo-ok','Đồng ý'],['meo-suy-nghi','Suy nghĩ'],['meo-an-mung','Ăn mừng'],['meo-code','Đang code'],
] as const;

const CHIBI = [
  ['chibi-chao','Xin chào'],['chibi-vui','Vui quá'],['chibi-yeu','Thích lắm'],['chibi-buon','Buồn'],
  ['chibi-khoc','Khóc'],['chibi-gian','Giận'],['chibi-ngu','Buồn ngủ'],['chibi-soc','Sốc'],
  ['chibi-ok','Đồng ý'],['chibi-suy-nghi','Suy nghĩ'],['chibi-an-mung','Ăn mừng'],['chibi-hoc','Đang học'],
] as const;

/**
 * Các bộ sticker tự vẽ (SVG trong /public/stickers) — nhân vật có thân mình,
 * tư thế và đạo cụ riêng nên không trùng lặp với bộ emoji.
 */
export const STICKER_PACKS: StickerPack[] = [
  { key: 'meo', label: 'Mèo Nova', items: CAT.map(([id, alt]) => ({ id, src: `/stickers/${id}.svg`, alt })) },
  { key: 'chibi', label: 'Chibi Nova', items: CHIBI.map(([id, alt]) => ({ id, src: `/stickers/${id}.svg`, alt })) },
];
