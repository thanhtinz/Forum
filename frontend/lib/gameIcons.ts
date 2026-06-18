// Emoji icon theo slug — đảm bảo icon đúng nghĩa, không phụ thuộc bộ sprite thiếu/sai
export const CROP_EMOJI: Record<string, string> = {
  lua: '🌾', 'ca-chua': '🍅', toi: '🧄', nho: '🍇', 'thanh-long': '🐲', xoai: '🥭',
  'dua-hau': '🍉', 'ca-rot': '🥕', khom: '🍍', bap: '🌽', 'dua-leo': '🥒', 'ca-tim': '🍆',
  'nha-dam': '🌵', 'hoa-hong': '🌹', 'huong-duong': '🌻', tulip: '🌷',
};

export const ANIMAL_EMOJI: Record<string, string> = {
  ga: '🐔', lon: '🐷', bo: '🐄', cuu: '🐑', 'ca-nuoi': '🐟', vit: '🦆', trau: '🐃', rua: '🐢',
};

export const cropEmoji = (slug: string) => CROP_EMOJI[slug] || '🌱';
export const animalEmoji = (slug: string) => ANIMAL_EMOJI[slug] || '🐾';
