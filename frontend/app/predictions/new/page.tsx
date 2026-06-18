'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, TrendingUp, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import ImageUpload from '@/components/ImageUpload';
import {
  PRED_CATEGORIES, MARKET_TYPES, ODDS_MODES, VISIBILITIES,
  defaultOptions, HANDICAP_LINES, OVERUNDER_LINES, parseTags,
} from '@/lib/predictions';

export default function NewPredictionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GAME');
  const [marketType, setMarketType] = useState('BINARY');
  const [oddsMode, setOddsMode] = useState('POOL');
  const [options, setOptions] = useState<string[]>(['Có', 'Không']);
  const [fixedOdds, setFixedOdds] = useState<string[]>(['1.9', '1.9']);
  const [line, setLine] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [joinPassword, setJoinPassword] = useState('');
  const [image, setImage] = useState('');
  const [banner, setBanner] = useState('');
  const [tags, setTags] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [resultAt, setResultAt] = useState('');
  const [minBet, setMinBet] = useState('10');
  const [maxBet, setMaxBet] = useState('');
  const [commissionBps, setCommissionBps] = useState('0');
  const [creatorStake, setCreatorStake] = useState('');
  const [isAdminMarket, setIsAdminMarket] = useState(false);
  const [resultSource, setResultSource] = useState('MANUAL');
  const [externalRef, setExternalRef] = useState('');
  const [autoSettleAt, setAutoSettleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');

  function applyType(t: string) {
    setMarketType(t);
    const opts = defaultOptions(t);
    setOptions(opts);
    setFixedOdds(opts.map(() => '1.90'));
  }
  function setOpt(i: number, v: string) { setOptions((p) => p.map((o, j) => (j === i ? v : o))); }
  function setOdd(i: number, v: string) { setFixedOdds((p) => p.map((o, j) => (j === i ? v : o))); }
  function addOpt() { setOptions((p) => [...p, '']); setFixedOdds((p) => [...p, '1.90']); }
  function delOpt(i: number) { setOptions((p) => p.filter((_, j) => j !== i)); setFixedOdds((p) => p.filter((_, j) => j !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) { setErr('Nhập tiêu đề'); return; }
    if (opts.length < 2) { setErr('Cần ít nhất 2 lựa chọn'); return; }
    if (oddsMode === 'FIXED' && fixedOdds.slice(0, options.length).some((o) => !(Number(o) > 1))) { setErr('Odds mỗi cửa phải > 1'); return; }
    if (oddsMode === 'FIXED' && !isAdminMarket && !(Number(creatorStake) > 0)) { setErr('Kèo odds cố định cần ký quỹ coin làm nhà cái'); return; }
    setBusy(true); setErr('');
    try {
      const body: any = {
        title: title.trim(), description: description.trim() || undefined,
        options: opts, category, marketType, oddsMode, visibility,
        minBet: Number(minBet) || 1,
        commissionBps: Number(commissionBps) || 0,
        tags: parseTags(tags),
      };
      if (oddsMode === 'FIXED') body.fixedOdds = fixedOdds.slice(0, options.length).map(Number);
      if (line) body.line = Number(line);
      if (visibility === 'PRIVATE' && joinPassword) body.joinPassword = joinPassword;
      if (image) body.image = image;
      if (banner) body.banner = banner;
      if (opensAt) body.opensAt = opensAt;
      if (closesAt) body.closesAt = closesAt;
      if (resultAt) body.resultAt = resultAt;
      if (maxBet) body.maxBet = Number(maxBet);
      if (oddsMode === 'FIXED' && !isAdminMarket) body.creatorStake = Number(creatorStake);
      if (isMod && isAdminMarket) body.isAdminMarket = true;
      if (isMod && resultSource === 'EXTERNAL') {
        body.resultSource = 'EXTERNAL';
        if (externalRef.trim()) body.externalRef = externalRef.trim();
        if (autoSettleAt) body.autoSettleAt = autoSettleAt;
      }

      const p = await api.post<{ id: string }>('/quiz/predictions', body);
      router.push(`/prediction?id=${p.id}`);
    } catch (e: any) { setErr(e.message || 'Tạo kèo thất bại'); setBusy(false); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để tạo kèo.</div>;

  const showLine = marketType === 'HANDICAP' || marketType === 'OVERUNDER';
  const lineOptions = marketType === 'HANDICAP' ? HANDICAP_LINES : OVERUNDER_LINES;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><TrendingUp size={22} /> Tạo kèo dự đoán</h1>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Tiêu đề kèo</label>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vd: GTA 7 ra mắt trước 2028?" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Mô tả</label>
          <textarea className="input min-h-[80px] w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Danh mục</label>
            <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(PRED_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Loại kèo</label>
            <select className="input w-full" value={marketType} onChange={(e) => applyType(e.target.value)}>
              {Object.entries(MARKET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {showLine && (
          <div>
            <label className="mb-1 block text-sm font-medium">Mức {marketType === 'HANDICAP' ? 'chấp' : 'tài xỉu'}</label>
            <select className="input w-full sm:w-48" value={line} onChange={(e) => setLine(e.target.value)}>
              <option value="">— chọn —</option>
              {lineOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Cơ chế odds</label>
          <select className="input w-full" value={oddsMode} onChange={(e) => setOddsMode(e.target.value)}>
            {Object.entries(ODDS_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <p className="mt-1 flex items-start gap-1 text-xs text-ink-500"><Info size={12} className="mt-0.5 shrink-0" />
            {oddsMode === 'POOL' ? 'Người thua góp quỹ chia cho người thắng theo tỷ lệ.' : 'Bạn làm nhà cái với odds cố định, cần ký quỹ coin để chi trả.'}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Các lựa chọn {oddsMode === 'FIXED' && '& odds'}</label>
            <button type="button" onClick={addOpt} className="btn-outline inline-flex items-center gap-1 !py-1 text-xs"><Plus size={13} /> Thêm cửa</button>
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input flex-1" placeholder={`Lựa chọn ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
                {oddsMode === 'FIXED' && (
                  <input className="input w-24" type="number" step="0.01" min="1.01" placeholder="odds" value={fixedOdds[i] ?? ''} onChange={(e) => setOdd(i, e.target.value)} />
                )}
                {options.length > 2 && <button type="button" onClick={() => delOpt(i)} className="text-ink-400 hover:text-red-500"><X size={16} /></button>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Mở cược</label>
            <input className="input w-full" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Khoá cược</label>
            <input className="input w-full" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Công bố KQ</label>
            <input className="input w-full" type="datetime-local" value={resultAt} onChange={(e) => setResultAt(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Cược tối thiểu</label>
            <input className="input w-full" type="number" min={1} value={minBet} onChange={(e) => setMinBet(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cược tối đa</label>
            <input className="input w-full" type="number" placeholder="không giới hạn" value={maxBet} onChange={(e) => setMaxBet(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hoa hồng (%)</label>
            <input className="input w-full" type="number" step="0.1" min={0} max={20} value={Number(commissionBps) / 100} onChange={(e) => setCommissionBps(String(Math.round(Number(e.target.value) * 100)))} />
          </div>
        </div>

        {oddsMode === 'FIXED' && !isAdminMarket && (
          <div>
            <label className="mb-1 block text-sm font-medium">Ký quỹ nhà cái (coin)</label>
            <input className="input w-full" type="number" min={1} value={creatorStake} onChange={(e) => setCreatorStake(e.target.value)} placeholder="Coin để đảm bảo chi trả thắng cược" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Chế độ</label>
            <select className="input w-full" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              {Object.entries(VISIBILITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {visibility === 'PRIVATE' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Mật khẩu tham gia</label>
              <input className="input w-full" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Thẻ (phân tách bằng dấu phẩy)</label>
          <input className="input w-full" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gta, rockstar" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ImageUpload value={image} onUploaded={setImage} label="Ảnh đại diện" />
          <ImageUpload value={banner} onUploaded={setBanner} label="Banner" />
        </div>

        {user?.role === 'ADMIN' && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isAdminMarket} onChange={(e) => setIsAdminMarket(e.target.checked)} />
              Kèo nhà cái hệ thống (admin) — hệ thống chi trả, không cần ký quỹ
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Nguồn kết quả</label>
                <select className="input w-full" value={resultSource} onChange={(e) => setResultSource(e.target.value)}>
                  <option value="MANUAL">Thủ công</option>
                  <option value="EXTERNAL">Tự động (nguồn ngoài)</option>
                </select>
              </div>
              {resultSource === 'EXTERNAL' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Mã tham chiếu</label>
                    <input className="input w-full" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="vd: match-123" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Tự chốt lúc</label>
                    <input className="input w-full" type="datetime-local" value={autoSettleAt} onChange={(e) => setAutoSettleAt(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            {resultSource === 'EXTERNAL' && <p className="text-xs text-ink-500">Cron sẽ tự chốt kèo theo nguồn ngoài sau thời điểm trên (cần cấu hình provider kết quả ở backend).</p>}
          </div>
        )}

        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-outline">Huỷ</button>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo kèo'}</button>
        </div>
      </form>
    </div>
  );
}
