'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, UserCheck, RefreshCw } from 'lucide-react';
import {
  gamePortal, GameServer, GameCharacter, IdentifierKind, IDENTIFIER_LABEL,
} from '@/lib/gamePortal';
import { useAuth } from '@/components/AuthProvider';

/**
 * Cổng xác minh nhân vật. Người dùng chọn server + nhập định danh; sau khi xác
 * minh thành công sẽ render `children(character, reset)`.
 */
export function CharacterGate({
  slug,
  children,
  intro,
}: {
  slug: string;
  intro?: string;
  children: (character: GameCharacter, reset: () => void) => React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [servers, setServers] = useState<GameServer[]>([]);
  const [kind, setKind] = useState<IdentifierKind>('character_name');
  const [serverId, setServerId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [character, setCharacter] = useState<GameCharacter | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    gamePortal.getServers(slug).then((s) => { setServers(s); setServerId(s[0]?.id || ''); }).catch(() => {});
    gamePortal.getIdentifierKind(slug).then((r) => setKind(r.kind)).catch(() => {});
  }, [slug]);

  async function verify() {
    setErr('');
    if (!serverId || !identifier.trim()) { setErr('Chọn server và nhập định danh nhân vật.'); return; }
    setVerifying(true);
    try {
      setCharacter(await gamePortal.verify(slug, serverId, identifier.trim()));
    } catch (e: any) {
      setErr(e.message || 'Xác minh thất bại');
    } finally {
      setVerifying(false);
    }
  }
  const reset = () => { setCharacter(null); setIdentifier(''); setErr(''); };

  if (!loading && !user)
    return <div className="card p-8 text-center text-ink-400">Vui lòng đăng nhập để sử dụng tính năng này.</div>;

  if (character) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/20 text-emerald-400"><UserCheck size={20} /></span>
            <div>
              <p className="font-semibold text-emerald-300">{character.name} <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs">Lv.{character.level}</span></p>
              <p className="text-xs text-ink-400">{character.serverName || character.serverId}</p>
            </div>
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-200"><RefreshCw size={14} /> Đổi nhân vật</button>
        </div>
        {children(character, reset)}
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2 text-ink-200">
        <ShieldCheck className="text-brand-400" />
        <h2 className="text-lg font-semibold">Xác minh nhân vật</h2>
      </div>
      {intro && <p className="mb-4 text-sm text-ink-400">{intro}</p>}
      <label className="mb-1 block text-sm text-ink-400">Server</label>
      <select className="input mb-3" value={serverId} onChange={(e) => setServerId(e.target.value)}>
        {servers.length === 0 && <option value="">— Đang tải —</option>}
        {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label className="mb-1 block text-sm text-ink-400">{IDENTIFIER_LABEL[kind]}</label>
      <input
        className="input mb-3" value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && verify()}
        placeholder={IDENTIFIER_LABEL[kind] + '...'}
      />
      {err && <p className="mb-3 text-sm text-rose-400">{err}</p>}
      <button onClick={verify} disabled={verifying} className="btn-primary w-full">
        {verifying ? <><Loader2 size={16} className="animate-spin" /> Đang xác minh...</> : 'Xác minh & tiếp tục'}
      </button>
    </div>
  );
}
