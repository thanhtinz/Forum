'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const id = useSearchParams().get('id') || '';
  useEffect(() => { router.replace(id ? `/comic/creator/edit?id=${id}` : '/comic/creator'); }, [router, id]);
  return null;
}
export default function MangaCreatorEditPage() {
  return <Suspense><Redirect /></Suspense>;
}
