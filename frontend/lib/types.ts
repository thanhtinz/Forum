export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  avatarFrameUrl?: string | null;
  shopBadgeUrl?: string | null;
  nameEffectCss?: string | null;
  role: 'GUEST' | 'MEMBER' | 'VIP' | 'MODERATOR' | 'ADMIN';
}

export interface ThreadAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
}

export interface ThreadPrefix {
  id: string;
  label: string;
  color?: string | null;
}

export interface Thread {
  id: string;
  title: string;
  slug: string;
  prefix?: string;
  prefixRef?: ThreadPrefix | null;
  bestAnswerId?: string | null;
  isPinned?: boolean;
  isLocked?: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostAt?: string;
  author?: ThreadAuthor;
  category?: { id: string; name: string; slug: string };
  tags?: { tag: { id: string; name: string; slug: string; color?: string | null } }[];
}

export interface Post {
  id: string;
  content: string;
  contentRaw?: string | null;
  likeCount: number;
  isFirstPost?: boolean;
  parentId?: string | null;
  createdAt: string;
  editCount?: number;
  lastEditAt?: string | null;
  author?: ThreadAuthor;
  reactions?: { emoji: string; userId: string }[];
  tipTotal?: number;
  tipCount?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
