'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  const mediaId = params.get('mediaId') || '';
  const chapterId = params.get('chapterId') || '';
  useEffect(() => {
    const qs = new URLSearchParams();
    if (mediaId) qs.set('mediaId', mediaId);
    if (chapterId) qs.set('chapterId', chapterId);
    router.replace(`/comic/creator/chapter/new${qs.toString() ? '?' + qs.toString() : ''}`);
  }, [router, mediaId, chapterId]);
  return null;
}
export default function MangaChapterNewPage() {
  return <Suspense><Redirect /></Suspense>;
}
