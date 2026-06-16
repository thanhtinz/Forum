'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { HelpCircle, Check, X, Coins, LogIn } from 'lucide-react';
import Link from 'next/link';

interface TriviaToday {
  id: string;
  question: string;
  options: string[];
  reward: number;
  answered: boolean;
  correctIndex?: number;
  myAnswer?: { choiceIndex: number; isCorrect: boolean } | null;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  rewardGiven: number;
}

export default function TriviaPage() {
  const { user } = useAuth();
  const [q, setQ] = useState<TriviaToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  function load() {
    setLoading(true);
    api
      .get<TriviaToday | null>('/quiz/trivia/today')
      .then((r) => setQ(r))
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, [user?.id]);

  async function submit(idx: number) {
    if (!user || !q || q.answered || result) return;
    setPicked(idx);
    setMsg('');
    try {
      const r = await api.post<AnswerResult>(`/quiz/trivia/${q.id}/answer`, { choiceIndex: idx });
      setResult(r);
    } catch (e: any) {
      setMsg(e.message);
      setPicked(null);
    }
  }

  // Trạng thái hiển thị: đáp án đúng + lựa chọn của người dùng
  const correctIndex = result?.correctIndex ?? q?.correctIndex;
  const myChoice = result ? picked : q?.myAnswer?.choiceIndex ?? null;
  const isAnswered = !!result || !!q?.answered;
  const wasCorrect = result ? result.correct : q?.myAnswer?.isCorrect;

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <HelpCircle size={22} /> Đố vui hôm nay
      </h1>

      {loading && <p className="text-sm text-ink-500">Đang tải…</p>}
      {!loading && !q && (
        <div className="card p-6 text-center text-ink-500">
          Hôm nay chưa có câu đố nào. Quay lại sau nhé!
        </div>
      )}

      {q && (
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-medium">{q.question}</p>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Coins size={14} /> {q.reward}
            </span>
          </div>

          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const isCorrectOpt = isAnswered && correctIndex === idx;
              const isMyWrong = isAnswered && myChoice === idx && correctIndex !== idx;
              let cls =
                'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition';
              if (isCorrectOpt)
                cls += ' border-green-500 bg-green-50 dark:bg-green-900/30';
              else if (isMyWrong) cls += ' border-red-500 bg-red-50 dark:bg-red-900/30';
              else cls += ' border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800';
              return (
                <button
                  key={idx}
                  className={cls}
                  disabled={isAnswered || !user}
                  onClick={() => submit(idx)}
                >
                  <span>{opt}</span>
                  {isCorrectOpt && <Check size={16} className="text-green-600" />}
                  {isMyWrong && <X size={16} className="text-red-600" />}
                </button>
              );
            })}
          </div>

          {!user && (
            <Link
              href="/login"
              className="flex items-center justify-center gap-1 rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800"
            >
              <LogIn size={15} /> Đăng nhập để trả lời và nhận coin
            </Link>
          )}

          {isAnswered && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                wasCorrect
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {wasCorrect ? (
                <span className="flex items-center gap-1">
                  <Check size={16} /> Chính xác!
                  {result && result.rewardGiven > 0 && ` Bạn nhận được ${result.rewardGiven} coin.`}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <X size={16} /> Chưa đúng. Chúc may mắn lần sau!
                </span>
              )}
            </div>
          )}

          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}
