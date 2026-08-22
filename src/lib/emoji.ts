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

const NOVA_FACES = [
  ['vui', 'Vui vẻ'], ['cuoi', 'Cười lớn'], ['yeu', 'Thả tim'], ['buon', 'Buồn'],
  ['gian', 'Giận'], ['soc', 'Bất ngờ'], ['ngu', 'Buồn ngủ'], ['suy-nghi', 'Suy nghĩ'],
  ['ok', 'Đồng ý'], ['tuyet', 'Tuyệt vời'], ['khoc', 'Khóc'], ['nhay-mat', 'Nháy mắt'],
] as const;

/** Bộ sticker tự dựng, lưu tại /public/stickers (SVG nhẹ, không cần mạng). */
export const STICKER_PACKS: StickerPack[] = [
  {
    key: 'nova',
    label: 'Nova',
    items: NOVA_FACES.map(([id, alt]) => ({ id, src: `/stickers/${id}.svg`, alt })),
  },
];
