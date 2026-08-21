'use client';

import { useActionState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { createGame, type ActionState } from '@/app/(admin)/admin/games/actions';

export function NewGameForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGame, {});

  return (
    <form action={action} className="space-y-3">
      <Field label="Tên game *"><input name="title" required maxLength={200} className="input" placeholder="Contra 4" /></Field>
      <Field label="Tên Việt hóa"><input name="titleVi" maxLength={200} className="input" placeholder="Contra 4 Việt hóa" /></Field>
      <Field label="Slug (bỏ trống để tự sinh)"><input name="slug" maxLength={80} className="input" placeholder="contra-4" /></Field>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo game
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      {children}
    </label>
  );
}
