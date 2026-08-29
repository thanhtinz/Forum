import type { Metadata } from 'next';
import { SITE_URL, getSiteSettings } from '@/lib/site';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

/** Tên và mô tả lấy từ cài đặt trong admin nên phải dựng metadata lúc chạy. */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.name} — Diễn đàn & kho game`,
      template: `%s · ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    keywords: ['diễn đàn', 'kho game', 'game java', 'điểm thưởng', site.name],
    openGraph: {
      type: 'website',
      siteName: site.name,
      title: site.name,
      description: site.description,
      locale: 'vi_VN',
      url: SITE_URL,
    },
    twitter: { card: 'summary_large_image', title: site.name, description: site.description },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Đặt lớp .dark trước khi vẽ để không chớp trắng khi đang ở chế độ tối */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
