import { ThreadList } from '@/components/ThreadList';
import { Sidebar } from '@/components/Sidebar';

export default function HomePage() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-card sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Chào mừng đến ForumHub</h1>
        <p className="mt-1 max-w-xl text-white/85">
          Diễn đàn cộng đồng tích hợp game hoá — chia sẻ, thảo luận, chơi game và mua bán source code.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <ThreadList />
        <Sidebar />
      </div>
    </div>
  );
}
