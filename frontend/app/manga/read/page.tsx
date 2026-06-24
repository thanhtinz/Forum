'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const id = useSearchParams().get('id') || '';
  useEffect(() => { router.replace(id ? `/comic/read?id=${id}` : '/comic'); }, [router, id]);
  return null;
}
export default function MangaReadPage() {
  return <Suspense><Redirect /></Suspense>;
}
