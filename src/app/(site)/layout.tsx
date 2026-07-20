import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container-nova flex-1 py-5">{children}</main>
      <Footer />
    </div>
  );
}
