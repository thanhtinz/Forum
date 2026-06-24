'use client';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/comic/creator/new'); }, [router]);
  return null;
}
export default function MangaCreatorNewPage() {
  return <Suspense><Redirect /></Suspense>;
}
