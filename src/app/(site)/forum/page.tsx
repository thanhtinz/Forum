import { permanentRedirect } from 'next/navigation';

/** Diễn đàn nay là trang chủ — giữ /forum để không hỏng liên kết cũ. */
export default function ForumIndexPage() {
  permanentRedirect('/');
}
