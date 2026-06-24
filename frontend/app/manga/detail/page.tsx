'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const slug = useSearchParams().get('slug') || '';
  useEffect(() => { router.replace(slug ? `/comic/detail?slug=${slug}` : '/comic'); }, [router, slug]);
  return null;
}
export default function MangaDetailPage() {
  return <Suspense><Redirect /></Suspense>;
}
