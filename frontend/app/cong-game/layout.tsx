// Khu Cổng game: giữ Header + footer dùng chung của forum (từ root layout),
// KHÔNG hiển thị Sidebar — nội dung chiếm toàn bộ chiều ngang.
export default function CongGameLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}
