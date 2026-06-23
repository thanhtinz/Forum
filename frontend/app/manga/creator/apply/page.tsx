'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, Btn, Field, Notice } from '@/components/admin/ui';

interface AppStatus {
  application: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reason: string;
    portfolio?: string | null;
    adminNote?: string | null;
    createdAt: string;
  } | null;
  isCreator: boolean;
}

const STATUS_INFO = {
  PENDING: {
    icon: <Clock size={20} className="text-amber-500" />,
    label: 'Đang chờ duyệt',
    cls: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40',
    desc: 'Đơn đăng ký của bạn đã được gửi. Admin sẽ xét duyệt sớm nhất có thể.',
  },
  APPROVED: {
    icon: <CheckCircle size={20} className="text-emerald-500" />,
    label: 'Đã được duyệt',
    cls: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40',
    desc: 'Chúc mừng! Bạn đã được duyệt làm tác giả. Bắt đầu đăng truyện ngay!',
  },
  REJECTED: {
    icon: <XCircle size={20} className="text-rose-500" />,
    label: 'Bị từ chối',
    cls: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40',
    desc: 'Đơn đăng ký của bạn chưa được chấp thuận. Bạn có thể chỉnh sửa và gửi lại.',
  },
};

export default function ApplyCreatorPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [form, setForm] = useState({ reason: '', portfolio: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<AppStatus>('/creator/apply/status').then(setStatus).catch(() => {});
  }, [user]);

  // Pre-fill form if re-applying after rejection
  useEffect(() => {
    if (status?.application?.status === 'REJECTED') {
      setForm({ reason: status.application.reason, portfolio: status.application.portfolio ?? '' });
    }
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason.trim()) { setErr('Vui lòng điền lý do muốn trở thành tác giả'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.post('/creator/apply', { reason: form.reason.trim(), portfolio: form.portfolio.trim() || undefined });
      setMsg('Đã gửi đơn thành công! Admin sẽ xét duyệt sớm.');
      const updated = await api.get<AppStatus>('/creator/apply/status');
      setStatus(updated);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (authLoading) return null;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;

  const app = status?.application;
  const isCreator = status?.isCreator ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <PageHeader icon={<BookOpen size={20} />} title="Đăng ký làm tác giả" />
      </div>

      {/* Already a creator */}
      {isCreator && (
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle size={28} className="text-emerald-500" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Bạn đã là tác giả được duyệt</p>
              <p className="text-sm text-ink-500">Truy cập trang quản lý để bắt đầu đăng truyện.</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/manga/creator"><Btn>Vào trang quản lý</Btn></Link>
          </div>
        </Card>
      )}

      {/* Current application status */}
      {!isCreator && app && app.status !== 'REJECTED' && (
        <div className={`rounded-xl border p-4 ${STATUS_INFO[app.status].cls}`}>
          <div className="flex items-start gap-3">
            {STATUS_INFO[app.status].icon}
            <div className="flex-1">
              <p className="font-semibold">{STATUS_INFO[app.status].label}</p>
              <p className="mt-0.5 text-sm">{STATUS_INFO[app.status].desc}</p>
              {app.status === 'APPROVED' && (
                <div className="mt-3">
                  <Link href="/manga/creator"><Btn>Bắt đầu đăng truyện</Btn></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejected — show note + allow re-apply */}
      {!isCreator && app?.status === 'REJECTED' && (
        <div className={`rounded-xl border p-4 ${STATUS_INFO.REJECTED.cls}`}>
          <div className="flex items-start gap-3">
            {STATUS_INFO.REJECTED.icon}
            <div>
              <p className="font-semibold">{STATUS_INFO.REJECTED.label}</p>
              <p className="mt-0.5 text-sm">{STATUS_INFO.REJECTED.desc}</p>
              {app.adminNote && (
                <p className="mt-2 text-sm"><span className="font-medium">Ghi chú admin:</span> {app.adminNote}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application form — show if no app or rejected */}
      {!isCreator && (!app || app.status === 'REJECTED') && (
        <Card>
          <h2 className="mb-4 font-semibold">
            {app?.status === 'REJECTED' ? 'Gửi lại đơn đăng ký' : 'Điền đơn đăng ký'}
          </h2>

          {err && <Notice kind="error">{err}</Notice>}
          {msg && <Notice kind="success">{msg}</Notice>}

          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Lý do muốn trở thành tác giả *"
              hint="Mô tả ngắn về bản thân, thể loại truyện bạn muốn đăng, kinh nghiệm sáng tác..."
            >
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={5}
                required
                className="input w-full"
                placeholder="Tôi muốn đăng truyện tranh về... Tôi đã từng sáng tác..."
              />
            </Field>

            <Field
              label="Portfolio / Link tác phẩm cũ (tuỳ chọn)"
              hint="Facebook, DeviantArt, trang web cá nhân, hoặc bất kỳ nơi nào bạn đã đăng tác phẩm"
            >
              <input
                value={form.portfolio}
                onChange={(e) => setForm((f) => ({ ...f, portfolio: e.target.value }))}
                className="input w-full"
                placeholder="https://..."
              />
            </Field>

            <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-500 dark:bg-ink-800/50">
              <p className="font-medium text-ink-600 dark:text-ink-300">Lưu ý khi đăng truyện:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>Truyện phải là tác phẩm gốc hoặc fan-made có thể hiện nguồn rõ ràng.</li>
                <li>Không đăng nội dung vi phạm bản quyền, 18+ mà không khai báo độ tuổi.</li>
                <li>Mỗi series cần qua kiểm duyệt trước khi xuất bản.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-1">
              <Btn type="submit" disabled={busy}>
                <Send size={14} /> {busy ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Info block for people without application */}
      {!isCreator && !app && (
        <Card className="bg-brand-50/50 dark:bg-brand-950/20">
          <h2 className="mb-2 font-semibold">Tính năng dành cho tác giả</h2>
          <ul className="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
            <li className="flex items-start gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" /> Đăng series truyện tranh hoặc truyện chữ lên nền tảng</li>
            <li className="flex items-start gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" /> Upload ảnh trang hoặc file ZIP/CBZ, hỗ trợ kéo thả sắp xếp</li>
            <li className="flex items-start gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" /> Theo dõi lượt đọc theo từng chương</li>
            <li className="flex items-start gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" /> Nhận thông báo khi series/chương được duyệt</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
