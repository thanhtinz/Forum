'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, XCircle, ChevronDown, ChevronUp, UserCheck, Clock, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Btn, Notice, Empty } from '@/components/admin/ui';

interface User { id: string; username: string; displayName?: string | null; avatar?: string | null }

interface PendingSeries {
  id: string;
  title: string;
  titleEnglish?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  language?: string | null;
  ageRating: number;
  creator: User;
  updatedAt: string;
  _count?: { chapterList: number };
}

interface PendingChapter {
  id: string;
  number: number;
  title?: string | null;
  chapterStatus: string;
  createdAt: string;
  media: { id: string; title: string; slug: string; coverUrl?: string | null };
  uploader: User;
}

interface CreatorApplication {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  portfolio?: string | null;
  createdAt: string;
  user: User;
}

type Tab = 'applications' | 'series' | 'chapters';

export default function AdminMangaCreatorPage() {
  const [tab, setTab] = useState<Tab>('applications');
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [series, setSeries] = useState<PendingSeries[]>([]);
  const [chapters, setChapters] = useState<PendingChapter[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  function load() {
    setErr('');
    api.get<CreatorApplication[]>('/creator/admin/applications').then(setApplications).catch((e: any) => setErr(e.message));
    api.get<PendingSeries[]>('/creator/admin/pending-series').then(setSeries).catch((e: any) => setErr(e.message));
    api.get<PendingChapter[]>('/creator/admin/pending-chapters').then(setChapters).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); }, []);

  async function moderateApplication(id: string, action: 'approve' | 'reject') {
    setBusy(id); setErr(''); setMsg('');
    try {
      await api.post(`/creator/admin/applications/${id}/moderate`, { action, adminNote: noteMap[id] });
      setMsg(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} đơn đăng ký ✓`);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function moderateSeries(id: string, action: 'approve' | 'reject') {
    setBusy(id); setErr(''); setMsg('');
    try {
      await api.post(`/creator/admin/series/${id}/moderate`, { action, adminNote: noteMap[id] });
      setMsg(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} series ✓`);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function moderateChapter(id: string, action: 'approve' | 'reject') {
    setBusy(id); setErr(''); setMsg('');
    try {
      await api.post(`/creator/admin/chapter/${id}/moderate`, { action });
      setMsg(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} chương ✓`);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'applications', label: 'Đơn đăng ký', count: applications.length },
    { key: 'series', label: 'Series', count: series.length },
    { key: 'chapters', label: 'Chương', count: chapters.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<BookOpen size={20} />} title="Duyệt truyện người dùng đăng" desc="Kiểm duyệt đơn tác giả, series và chương chờ duyệt" />

      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-ink-100 bg-ink-50 p-1 dark:border-ink-800 dark:bg-ink-900/50">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-ink-100' : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab === t.key ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400' : 'bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications tab */}
      {tab === 'applications' && (
        <Card>
          <SectionTitle hint={`${applications.length} đơn đang chờ`}>Đơn đăng ký tác giả</SectionTitle>
          {applications.length === 0 ? (
            <Empty icon={<UserCheck size={32} />} title="Không có đơn đăng ký nào chờ duyệt" />
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {applications.map((app) => (
                <div key={app.id} className="py-4">
                  <div className="flex items-start gap-3">
                    {app.user.avatar ? (
                      <img src={app.user.avatar} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-ink-100 text-ink-300 dark:bg-ink-800">
                        <UserCheck size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{app.user.displayName || app.user.username}</p>
                          <p className="text-xs text-ink-400">@{app.user.username} · {new Date(app.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <button
                          onClick={() => setExpandedApp((e) => (e === app.id ? null : app.id))}
                          className="text-ink-400 hover:text-ink-600"
                        >
                          {expandedApp === app.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {expandedApp === app.id && (
                        <div className="mt-2 space-y-2">
                          <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                            <p className="mb-1 font-medium">Lý do:</p>
                            <p className="whitespace-pre-wrap">{app.reason}</p>
                          </div>
                          {app.portfolio && (
                            <a
                              href={app.portfolio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                            >
                              <ExternalLink size={11} /> Portfolio: {app.portfolio}
                            </a>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          value={noteMap[app.id] ?? ''}
                          onChange={(e) => setNoteMap((m) => ({ ...m, [app.id]: e.target.value }))}
                          placeholder="Ghi chú admin (tuỳ chọn)"
                          className="input flex-1 min-w-0 text-xs"
                        />
                        <Btn size="sm" onClick={() => moderateApplication(app.id, 'approve')} disabled={busy === app.id}>
                          <CheckCircle size={13} /> Duyệt
                        </Btn>
                        <Btn size="sm" variant="danger" onClick={() => moderateApplication(app.id, 'reject')} disabled={busy === app.id}>
                          <XCircle size={13} /> Từ chối
                        </Btn>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Series tab */}
      {tab === 'series' && (
        <Card>
          <SectionTitle hint={`${series.length} series đang chờ`}>Series chờ duyệt</SectionTitle>
          {series.length === 0 ? (
            <Empty icon={<CheckCircle size={32} />} title="Không có series nào chờ duyệt" />
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {series.map((s) => (
                <div key={s.id} className="py-4">
                  <div className="flex items-start gap-3">
                    {s.coverUrl ? (
                      <img src={s.coverUrl} alt="" className="h-20 w-14 flex-none rounded object-cover" />
                    ) : (
                      <div className="grid h-20 w-14 flex-none place-items-center rounded bg-ink-100 text-ink-300 dark:bg-ink-800">
                        <BookOpen size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{s.title}</p>
                          {s.titleEnglish && <p className="text-xs text-ink-400">{s.titleEnglish}</p>}
                          <p className="text-xs text-ink-400">
                            Tác giả: <span className="font-medium">{s.creator.displayName || s.creator.username}</span>
                            {' · '}Ngôn ngữ: {s.language ?? 'vi'}
                            {s.ageRating > 0 && <> · <span className="text-rose-500">{s.ageRating}+</span></>}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedSeries((e) => (e === s.id ? null : s.id))}
                          className="text-ink-400 hover:text-ink-600"
                        >
                          {expandedSeries === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {expandedSeries === s.id && s.description && (
                        <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                          {s.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          value={noteMap[s.id] ?? ''}
                          onChange={(e) => setNoteMap((m) => ({ ...m, [s.id]: e.target.value }))}
                          placeholder="Ghi chú (tuỳ chọn)"
                          className="input flex-1 min-w-0 text-xs"
                        />
                        <Btn size="sm" onClick={() => moderateSeries(s.id, 'approve')} disabled={busy === s.id}>
                          <CheckCircle size={13} /> Duyệt
                        </Btn>
                        <Btn size="sm" variant="danger" onClick={() => moderateSeries(s.id, 'reject')} disabled={busy === s.id}>
                          <XCircle size={13} /> Từ chối
                        </Btn>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Chapters tab */}
      {tab === 'chapters' && (
        <Card>
          <SectionTitle hint={`${chapters.length} chương đang chờ`}>Chương chờ duyệt</SectionTitle>
          {chapters.length === 0 ? (
            <Empty icon={<CheckCircle size={32} />} title="Không có chương nào chờ duyệt" />
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {chapters.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 py-3">
                  {ch.media.coverUrl ? (
                    <img src={ch.media.coverUrl} alt="" className="h-12 w-8 flex-none rounded object-cover" />
                  ) : (
                    <div className="grid h-12 w-8 flex-none place-items-center rounded bg-ink-100 text-ink-300 dark:bg-ink-800">
                      <BookOpen size={14} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{ch.media.title} — Tập {ch.number}{ch.title ? `: ${ch.title}` : ''}</p>
                    <p className="text-xs text-ink-400">
                      Người đăng: <span className="font-medium">{ch.uploader.displayName || ch.uploader.username}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Btn size="sm" onClick={() => moderateChapter(ch.id, 'approve')} disabled={busy === ch.id}>
                      <CheckCircle size={13} /> Duyệt
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => moderateChapter(ch.id, 'reject')} disabled={busy === ch.id}>
                      <XCircle size={13} /> Từ chối
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
