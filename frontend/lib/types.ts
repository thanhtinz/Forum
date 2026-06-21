export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  avatarFrameUrl?: string | null;
  vipBadgeUrl?: string | null;
  vipTierName?: string | null;
  role: 'GUEST' | 'MEMBER' | 'VIP' | 'MODERATOR' | 'ADMIN';
}

export interface ThreadAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
}

export interface Thread {
  id: string;
  title: string;
  slug: string;
  prefix?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostAt?: string;
  author?: ThreadAuthor;
  category?: { id: string; name: string; slug: string };
}

export interface Post {
  id: string;
  content: string;
  likeCount: number;
  isFirstPost?: boolean;
  createdAt: string;
  author?: ThreadAuthor;
  reactions?: { emoji: string; userId: string }[];
  tipTotal?: number;
  tipCount?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
