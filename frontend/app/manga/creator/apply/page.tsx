'use client';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/comic/creator/apply'); }, [router]);
  return null;
}
export default function MangaCreatorApplyPage() {
  return <Suspense><Redirect /></Suspense>;
}
