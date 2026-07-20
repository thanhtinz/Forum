import { FileQuestion } from 'lucide-react';
import { PostCard, type PostCardData } from './PostCard';

/** Lưới bài viết dùng chung (danh mục, thẻ, tìm kiếm…). */
export function PostGrid({ posts, empty }: { posts: PostCardData[]; empty?: string }) {
  if (posts.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 p-12 text-center text-ink-400">
        <FileQuestion size={30} />
        <p>{empty ?? 'Chưa có bài viết nào.'}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {posts.map((p) => <PostCard key={p.slug} post={p} />)}
    </div>
  );
}
