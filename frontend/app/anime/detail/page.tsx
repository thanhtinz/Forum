'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const slug = useSearchParams().get('slug') || '';
  useEffect(() => {
    if (!slug) { router.replace('/movie'); return; }
    // We don't know type here, default redirect to movie; actual routing handled by the new detail pages
    router.replace(`/movie/detail?slug=${slug}`);
  }, [router, slug]);
  return null;
}
export default function AnimeDetailPage() {
  return <Suspense><Redirect /></Suspense>;
}
