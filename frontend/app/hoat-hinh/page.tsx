'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function Redirect() {
  const router = useRouter();
  const q = useSearchParams().get('genre');
  useEffect(() => { router.replace(q ? `/movie?genre=${q}` : '/movie'); }, [router, q]);
  return null;
}
export default function HoatHinhPage() {
  return <Suspense><Redirect /></Suspense>;
}
