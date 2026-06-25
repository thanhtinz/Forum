'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Redirect() {
  const router = useRouter();
  useSearchParams(); // consumed but we just redirect to /chat
  useEffect(() => { router.replace('/chat'); }, [router]);
  return null;
}

export default function ConversationsPage() {
  return <Suspense><Redirect /></Suspense>;
}
