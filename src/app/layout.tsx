import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Blog, diễn đàn & nội dung trả phí`,
    template: '%s · Nova',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['blog', 'diễn đàn', 'nội dung trả phí', 'tài nguyên', 'Nova', 'Zibll'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'vi_VN',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
