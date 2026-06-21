'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Pencil, HelpCircle } from 'lucide-react';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  reward: number;
  activeDate?: string | null;
  isActive: boolean;
  _count?: { answers: number };
}

function parseOptions(raw: string): string[] {
  return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

export default function AdminQuiz() {
  const [msg, setMsg] = useState('');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [tForm, setTForm] = useState({ question: '', options: '', correctIndex: '0', reward: '10', activeDate: '', isActive: true });
  const [tEditId, setTEditId] = useState<string | null>(null);

  function loadTrivia() {
    api.get<TriviaQuestion[]>('/quiz/admin/trivia').then(setQuestions).catch((e) => setMsg(e.message));
  }
  useEffect(() => { loadTrivia(); }, []);

  function resetTrivia() {
    setTForm({ question: '', options: '', correctIndex: '0', reward: '10', activeDate: '', isActive: true });
    setTEditId(null);
  }
  function startEditTrivia(q: TriviaQuestion) {
    setTEditId(q.id);
    setTForm({
      question: q.question, options: q.options.join('\n'), correctIndex: String(q.correctIndex),
      reward: String(q.reward), activeDate: q.activeDate ? q.activeDate.slice(0, 10) : '', isActive: q.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveTrivia(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const payload = {
      question: tForm.question, options: parseOptions(tForm.options), correctIndex: Number(tForm.correctIndex),
      reward: Number(tForm.reward), activeDate: tForm.activeDate || null, isActive: tForm.isActive,
    };
    try {
      if (tEditId) await api.patch(`/quiz/admin/trivia/${tEditId}`, payload);
      else await api.post('/quiz/admin/trivia', payload);
      resetTrivia();
      setMsg(tEditId ? 'Đã lưu câu đố ✓' : 'Đã tạo câu đố ✓');
      loadTrivia();
    } catch (err: any) { setMsg(err.message); }
  }

  async function deleteTrivia(id: string) {
    if (!confirm('Xoá câu đố này?')) return;
    try {
      await api.del(`/quiz/admin/trivia/${id}`);
      if (tEditId === id) resetTrivia();
      loadTrivia();
    } catch (err: any) { setMsg(err.message); }
  }

  const triviaOptions = parseOptions(tForm.options);

  return (
    <div className="space-y-5">
      <PageHeader icon={<HelpCircle size={20} />} title="Đố vui" desc="Tạo câu đố hằng ngày — người chơi trả lời đúng nhận thưởng Xu." />
      {msg && <Notice kind="success">{msg}</Notice>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{tEditId ? 'Sửa câu đố' : 'Tạo câu đố'}</SectionTitle>
          <form onSubmit={saveTrivia} className="space-y-3">
            <Field label="Câu hỏi"><input className="input" placeholder="Nhập câu hỏi" value={tForm.question} onChange={(e) => setTForm({ ...tForm, question: e.target.value })} required /></Field>
            <Field label="Các lựa chọn" hint="Mỗi dòng một lựa chọn (hoặc phân tách bởi dấu phẩy).">
              <textarea className="input min-h-[90px]" value={tForm.options} onChange={(e) => setTForm({ ...tForm, options: e.target.value })} required />
            </Field>
            <div className="flex gap-2">
              <Field label="Đáp án đúng" className="flex-1">
                <select className="input" value={tForm.correctIndex} onChange={(e) => setTForm({ ...tForm, correctIndex: e.target.value })}>
                  {triviaOptions.length === 0 && <option value="0">—</option>}
                  {triviaOptions.map((o, i) => <option key={i} value={i}>{i}: {o}</option>)}
                </select>
              </Field>
              <Field label="Xu thưởng"><input className="input w-28" type="number" min={0} value={tForm.reward} onChange={(e) => setTForm({ ...tForm, reward: e.target.value })} /></Field>
            </div>
            <div className="flex items-center gap-3">
              <Field label="Ngày hiển thị"><input className="input w-44" type="date" value={tForm.activeDate} onChange={(e) => setTForm({ ...tForm, activeDate: e.target.value })} /></Field>
              <label className="mt-5 flex items-center gap-1.5 text-sm"><input type="checkbox" checked={tForm.isActive} onChange={(e) => setTForm({ ...tForm, isActive: e.target.checked })} /> Kích hoạt</label>
            </div>
            <p className="text-xs text-ink-400">Để trống ngày = câu đố luôn hiển thị.</p>
            <div className="flex gap-2">
              <Btn type="submit"><Plus size={15} /> {tEditId ? 'Lưu' : 'Tạo'}</Btn>
              {tEditId && <Btn variant="outline" onClick={resetTrivia}>Huỷ</Btn>}
            </div>
          </form>
        </Card>

        <Card pad={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
              <tr><th className="p-3">Câu hỏi</th><th className="p-3">Đáp án</th><th className="p-3">Xu</th><th className="p-3">Ngày</th><th className="p-3">Hiện</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="p-3">{q.question}</td>
                  <td className="p-3 text-xs text-ink-500">{q.options[q.correctIndex]}</td>
                  <td className="p-3">{q.reward}</td>
                  <td className="p-3 text-xs text-ink-400">{q.activeDate ? q.activeDate.slice(0, 10) : '—'}</td>
                  <td className="p-3">{q.isActive ? '✓' : '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEditTrivia(q)} className="text-brand-600" title="Sửa"><Pencil size={15} /></button>
                      <button onClick={() => deleteTrivia(q.id)} className="text-rose-600" title="Xoá"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && <tr><td colSpan={6}><Empty title="Chưa có câu đố nào" /></td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
