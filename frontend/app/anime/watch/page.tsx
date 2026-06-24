'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const ep = useSearchParams().get('ep') || '';
  useEffect(() => { router.replace(ep ? `/movie/watch?ep=${ep}` : '/movie'); }, [router, ep]);
  return null;
}
export default function WatchPage() {
  return <Suspense><Redirect /></Suspense>;
}
