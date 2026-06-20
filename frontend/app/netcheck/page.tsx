'use client';

import { useState } from 'react';
import { Globe, Search, Loader2, Server, ShieldCheck, Network, Link2, MapPin, FileText, ArrowRightLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Field = { name: string; label: string; placeholder?: string; type?: string; default?: string };
type Tool = { key: string; label: string; desc: string; icon: any; path: string; fields: Field[] };

const TOOLS: Tool[] = [
  { key: 'dns', label: 'DNS Lookup', desc: 'Tra cứu bản ghi DNS', icon: Network, path: '/netcheck/dns',
    fields: [{ name: 'host', label: 'Tên miền', placeholder: 'example.com' }, { name: 'type', label: 'Loại', type: 'select', default: 'A' }] },
  { key: 'ip', label: 'IP Lookup', desc: 'Vị trí, ISP, ASN của IP', icon: MapPin, path: '/netcheck/ip',
    fields: [{ name: 'ip', label: 'Địa chỉ IP (trống = IP của bạn)', placeholder: '8.8.8.8' }] },
  { key: 'http', label: 'HTTP Check', desc: 'Mã trạng thái, header, thời gian', icon: Link2, path: '/netcheck/http',
    fields: [{ name: 'url', label: 'URL', placeholder: 'https://example.com' }] },
  { key: 'ssl', label: 'SSL Certificate', desc: 'Chứng chỉ, ngày hết hạn', icon: ShieldCheck, path: '/netcheck/ssl',
    fields: [{ name: 'host', label: 'Tên miền', placeholder: 'example.com' }, { name: 'port', label: 'Cổng', placeholder: '443' }] },
  { key: 'port', label: 'Port Check', desc: 'Kiểm tra cổng mở/đóng', icon: Server, path: '/netcheck/port',
    fields: [{ name: 'host', label: 'Tên miền / IP', placeholder: 'example.com' }, { name: 'port', label: 'Cổng', placeholder: '443' }] },
  { key: 'rdns', label: 'Reverse DNS', desc: 'IP → hostname (PTR)', icon: ArrowRightLeft, path: '/netcheck/rdns',
    fields: [{ name: 'ip', label: 'Địa chỉ IP', placeholder: '1.1.1.1' }] },
  { key: 'whois', label: 'WHOIS', desc: 'Thông tin đăng ký tên miền', icon: FileText, path: '/netcheck/whois',
    fields: [{ name: 'domain', label: 'Tên miền', placeholder: 'example.com' }] },
];
const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA'];

function Result({ tool, data }: { tool: string; data: any }) {
  if (tool === 'dns') return (
    <div className="space-y-1">
      <p className="text-sm text-ink-500">{data.records?.length || 0} bản ghi {data.type} cho <b>{data.host}</b></p>
      {(data.records || []).map((r: any, i: number) => (
        <code key={i} className="block break-all rounded bg-ink-50 px-2 py-1 text-sm dark:bg-ink-900">{typeof r === 'object' ? JSON.stringify(r) : String(r)}</code>
      ))}
    </div>
  );
  if (tool === 'rdns') return <div className="space-y-1">{(data.hostnames || []).map((h: string) => <code key={h} className="block rounded bg-ink-50 px-2 py-1 text-sm dark:bg-ink-900">{h}</code>)}</div>;
  if (tool === 'port') return (
    <div className={`rounded-lg p-3 text-sm font-medium ${data.open ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
      Cổng {data.port} trên {data.host} ({data.ip}): <b>{data.open ? `MỞ (${data.latencyMs}ms)` : 'ĐÓNG / lọc'}</b>
    </div>
  );
  if (tool === 'ssl') return (
    <div className="space-y-1 text-sm">
      <Row k="Trạng thái" v={data.valid ? '✅ Hợp lệ' : '⚠️ Không xác thực được'} />
      <Row k="Chủ thể (CN)" v={data.subject} /><Row k="Nhà phát hành" v={data.issuer} />
      <Row k="Hiệu lực từ" v={data.validFrom} /><Row k="Hết hạn" v={`${data.validTo} (còn ${data.daysLeft} ngày)`} />
      {data.san?.length > 0 && <Row k="SAN" v={data.san.join(', ')} />}
    </div>
  );
  if (tool === 'http') return (
    <div className="space-y-1 text-sm">
      <Row k="Trạng thái" v={`${data.status} ${data.statusText}`} /><Row k="Thời gian" v={`${data.timeMs} ms`} />
      {data.redirect && <Row k="Chuyển hướng" v={data.redirect} />}
      {data.server && <Row k="Server" v={data.server} />}{data.contentType && <Row k="Content-Type" v={data.contentType} />}
      <details className="mt-1"><summary className="cursor-pointer text-xs text-brand-600">Tất cả header</summary>
        <pre className="mt-1 max-h-60 overflow-auto rounded bg-ink-50 p-2 text-xs dark:bg-ink-900">{Object.entries(data.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
      </details>
    </div>
  );
  if (tool === 'ip') return (
    <div className="space-y-1 text-sm">
      <Row k="IP" v={data.query} /><Row k="Quốc gia" v={`${data.country} · ${data.regionName} · ${data.city}`} />
      <Row k="ISP" v={data.isp} /><Row k="Tổ chức" v={data.org} /><Row k="ASN" v={`${data.as || ''} ${data.asname || ''}`} />
      <Row k="Múi giờ" v={data.timezone} /><Row k="Toạ độ" v={`${data.lat}, ${data.lon}`} />
      <div className="flex gap-1.5 pt-1">
        {data.proxy && <span className="chip bg-amber-100 text-amber-700">Proxy/VPN</span>}
        {data.hosting && <span className="chip bg-sky-100 text-sky-700">Hosting</span>}
        {data.mobile && <span className="chip bg-violet-100 text-violet-700">Mobile</span>}
      </div>
    </div>
  );
  if (tool === 'whois') return (
    <div><p className="mb-1 text-xs text-ink-400">Máy chủ: {data.server}</p>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-ink-50 p-2 text-xs dark:bg-ink-900">{data.raw}</pre></div>
  );
  return <pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex gap-2"><span className="w-32 shrink-0 text-ink-500">{k}</span><span className="break-all font-medium">{v}</span></div>;
}

export default function NetcheckPage() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState(TOOLS[0]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState<any>(null);

  if (!loading && !user) return <div className="card m-6 p-10 text-center text-ink-500">Đăng nhập để dùng công cụ mạng.</div>;

  function pick(t: Tool) { setActive(t); setData(null); setErr(''); setForm({}); }

  async function run() {
    setErr(''); setBusy(true); setData(null);
    try {
      const params = new URLSearchParams();
      for (const f of active.fields) { const v = (form[f.name] ?? f.default ?? '').trim(); if (v) params.set(f.name, v); }
      setData(await api.get<any>(`${active.path}?${params}`));
    } catch (e: any) { setErr(e.message || 'Lỗi'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-700 to-blue-700 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Globe /> Công cụ mạng</h1>
        <p className="mt-1 text-white/85">Chẩn đoán DNS, IP, HTTP, SSL, cổng, WHOIS — tra cứu nhanh.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Danh sách công cụ */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {TOOLS.map((t) => (
            <button key={t.key} onClick={() => pick(t)}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition ${active.key === t.key ? 'border-brand-500 bg-brand-50 dark:bg-ink-800' : 'border-ink-200 hover:border-brand-300 dark:border-ink-800'}`}>
              <t.icon size={18} className="shrink-0 text-brand-500" />
              <span><span className="block font-semibold">{t.label}</span><span className="block text-[11px] text-ink-400">{t.desc}</span></span>
            </button>
          ))}
        </div>

        {/* Form + kết quả */}
        <div className="space-y-3">
          <div className="card space-y-3 p-4">
            <h2 className="flex items-center gap-2 font-semibold"><active.icon size={18} className="text-brand-500" /> {active.label}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {active.fields.map((f) => (
                <label key={f.name} className="block text-sm">{f.label}
                  {f.type === 'select'
                    ? <select className="input mt-1" value={form[f.name] ?? f.default} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                        {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    : <input className="input mt-1" placeholder={f.placeholder} value={form[f.name] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && run()} />}
                </label>
              ))}
            </div>
            <button onClick={run} disabled={busy} className="btn-primary">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Đang kiểm tra…</> : <><Search size={15} /> Kiểm tra</>}
            </button>
            {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}
          </div>
          {data && <div className="card p-4"><Result tool={active.key} data={data} /></div>}
        </div>
      </div>
    </div>
  );
}
