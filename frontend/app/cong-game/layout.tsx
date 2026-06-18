import { Sidebar } from '@/components/Sidebar';

// Bố cục dùng chung cho toàn bộ khu Cổng game: giữ nguyên Header + footer của
// forum (từ root layout) và thêm menu Sidebar 2 cột giống trang chủ.
export default function CongGameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      <Sidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
