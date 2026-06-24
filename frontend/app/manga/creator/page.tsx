'use client';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/comic/creator'); }, [router]);
  return null;
}
export default function MangaCreatorPage() {
  return <Suspense><Redirect /></Suspense>;
}
