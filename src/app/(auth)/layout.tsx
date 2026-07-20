import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-ink-100 px-4 py-10 dark:from-ink-950 dark:to-ink-900">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-xl font-black text-white">N</span>
        <span className="text-2xl font-black tracking-tight">Nova</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-xs text-ink-400">© 2026 Nova Platform</p>
    </div>
  );
}
