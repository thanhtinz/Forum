import { db } from './db';
import { areFriends } from './friend';
import {
  ALBUM_PAGE_SIZE, PHOTO_PAGE_SIZE,
  type AlbumCard, type PhotoItem, type Privacy,
} from './album-const';

export * from './album-const';

export interface Viewer {
  id: string | null;
  role?: string | null;
}

/**
 * Những mức riêng tư mà người này được xem trên hồ sơ của người kia.
 *
 * Trả về danh sách mức chứ không trả về true/false cho từng album: có nó thì
 * việc lọc nằm gọn trong `where` của truy vấn, nên album không được xem sẽ
 * không bao giờ được dựng ra để mà lọt vào gói dữ liệu gửi xuống trình duyệt.
 */
export async function visiblePrivacies(viewer: Viewer, ownerId: string): Promise<Privacy[]> {
  if (viewer.id === ownerId) return ['PUBLIC', 'FRIENDS', 'PRIVATE'];
  // Quản trị viên KHÔNG được mở album riêng tư của người khác: đây là ảnh cá
  // nhân, không phải nội dung đăng công khai cần kiểm duyệt.
  if (viewer.id && (await areFriends(viewer.id, ownerId))) return ['PUBLIC', 'FRIENDS'];
  return ['PUBLIC'];
}

/** Một trang album trên hồ sơ của ai đó. */
export async function getAlbums(ownerId: string, viewer: Viewer, page = 1): Promise<{
  items: AlbumCard[]; total: number; totalPages: number;
}> {
  const where = { ownerId, privacy: { in: await visiblePrivacies(viewer, ownerId) } };

  const [total, rows] = await Promise.all([
    db.photoAlbum.count({ where }),
    db.photoAlbum.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * ALBUM_PAGE_SIZE,
      take: ALBUM_PAGE_SIZE,
      select: {
        id: true, name: true, description: true, cover: true,
        privacy: true, photoCount: true, createdAt: true,
      },
    }),
  ]);

  return { items: rows, total, totalPages: Math.ceil(total / ALBUM_PAGE_SIZE) };
}

/** Đếm album mà người này được xem — để hiện con số trên hồ sơ. */
export async function countVisibleAlbums(ownerId: string, viewer: Viewer): Promise<number> {
  return db.photoAlbum.count({
    where: { ownerId, privacy: { in: await visiblePrivacies(viewer, ownerId) } },
  });
}

export interface AlbumView {
  id: string;
  name: string;
  description: string | null;
  privacy: Privacy;
  photoCount: number;
  owner: { id: string; username: string | null; name: string | null; image: string | null };
  isOwner: boolean;
  photos: PhotoItem[];
  page: number;
  totalPages: number;
}

/**
 * Một album kèm một trang ảnh — hoặc null nếu người xem không được vào.
 *
 * Kiểm quyền TRƯỚC khi hỏi ảnh: hỏi ảnh rồi mới kiểm thì đường dẫn ảnh đã
 * nằm trong bộ nhớ của trang, chỉ chờ một chỗ sơ ý là lọt ra ngoài.
 */
export async function getAlbum(id: string, viewer: Viewer, page = 1): Promise<AlbumView | null> {
  const album = await db.photoAlbum.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, privacy: true, photoCount: true, ownerId: true,
      owner: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  if (!album) return null;

  const allowed = await visiblePrivacies(viewer, album.ownerId);
  if (!allowed.includes(album.privacy)) return null;

  const photos = await db.photo.findMany({
    where: { albumId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    skip: (Math.max(1, page) - 1) * PHOTO_PAGE_SIZE,
    take: PHOTO_PAGE_SIZE,
    select: { id: true, url: true, caption: true, createdAt: true },
  });

  return {
    id: album.id,
    name: album.name,
    description: album.description,
    privacy: album.privacy,
    photoCount: album.photoCount,
    owner: album.owner,
    isOwner: viewer.id === album.ownerId,
    photos,
    page: Math.max(1, page),
    totalPages: Math.max(1, Math.ceil(album.photoCount / PHOTO_PAGE_SIZE)),
  };
}
