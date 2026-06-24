'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function Redirect() {
  const router = useRouter();
  const q = useSearchParams().get('genre');
  useEffect(() => { router.replace(q ? `/comic?genre=${q}` : '/comic'); }, [router, q]);
  return null;
}
export default function TruyenTranhPage() {
  return <Suspense><Redirect /></Suspense>;
}
