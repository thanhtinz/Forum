'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Pencil, HelpCircle, TrendingUp, Lock, CheckCircle2 } from 'lucide-react';

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

interface Prediction {
  id: string;
  title: string;
  description?: string | null;
  options: string[];
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
  correctIndex?: number | null;
  pool: number;
  betCount: number;
}

function parseOptions(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminQuiz() {
  const [msg, setMsg] = useState('');

  // ── Trivia ──
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [tForm, setTForm] = useState({
    question: '',
    options: '',
    correctIndex: '0',
    reward: '10',
    activeDate: '',
    isActive: true,
  });
  const [tEditId, setTEditId] = useState<string | null>(null);

  // ── Predictions ──
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [pForm, setPForm] = useState({ title: '', description: '', options: '', closesAt: '' });

  function loadTrivia() {
    api.get<TriviaQuestion[]>('/quiz/admin/trivia').then(setQuestions).catch((e) => setMsg(e.message));
  }
  function loadPreds() {
    api.get<Prediction[]>('/quiz/predictions').then(setPreds).catch((e) => setMsg(e.message));
  }
  useEffect(() => {
    loadTrivia();
    loadPreds();
  }, []);

  function resetTrivia() {
    setTForm({ question: '', options: '', correctIndex: '0', reward: '10', activeDate: '', isActive: true });
    setTEditId(null);
  }
  function startEditTrivia(q: TriviaQuestion) {
    setTEditId(q.id);
    setTForm({
      question: q.question,
      options: q.options.join('\n'),
      correctIndex: String(q.correctIndex),
      reward: String(q.reward),
      activeDate: q.activeDate ? q.activeDate.slice(0, 10) : '',
      isActive: q.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveTrivia(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const options = parseOptions(tForm.options);
    const payload = {
      question: tForm.question,
      options,
      correctIndex: Number(tForm.correctIndex),
      reward: Number(tForm.reward),
      activeDate: tForm.activeDate || null,
      isActive: tForm.isActive,
    };
    try {
      if (tEditId) await api.patch(`/quiz/admin/trivia/${tEditId}`, payload);
      else await api.post('/quiz/admin/trivia', payload);
      resetTrivia();
      setMsg(tEditId ? 'Đã lưu câu đố ✓' : 'Đã tạo câu đố ✓');
      loadTrivia();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function deleteTrivia(id: string) {
    if (!confirm('Xoá câu đố này?')) return;
    try {
      await api.del(`/quiz/admin/trivia/${id}`);
      if (tEditId === id) resetTrivia();
      loadTrivia();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function createPred(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const options = parseOptions(pForm.options);
    try {
      await api.post('/quiz/admin/predictions', {
        title: pForm.title,
        description: pForm.description || undefined,
        options,
        closesAt: pForm.closesAt || null,
      });
      setPForm({ title: '', description: '', options: '', closesAt: '' });
      setMsg('Đã tạo dự đoán ✓');
      loadPreds();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function lockPred(id: string) {
    try {
      await api.post(`/quiz/admin/predictions/${id}/lock`);
      loadPreds();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function settlePred(p: Prediction) {
    const raw = prompt(
      `Chốt kết quả "${p.title}". Nhập số thứ tự phương án đúng (0-${p.options.length - 1}):\n` +
        p.options.map((o, i) => `${i}: ${o}`).join('\n'),
    );
    if (raw === null) return;
    const correctIndex = Number(raw);
    if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex >= p.options.length) {
      setMsg('Số thứ tự không hợp lệ');
      return;
    }
    try {
      await api.post(`/quiz/admin/predictions/${p.id}/settle`, { correctIndex });
      setMsg('Đã chốt kết quả ✓');
      loadPreds();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function deletePred(id: string) {
    if (!confirm('Xoá dự đoán này? (sẽ hoàn coin cho các lượt đặt nếu chưa chốt)')) return;
    try {
      await api.del(`/quiz/admin/predictions/${id}`);
      loadPreds();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  const triviaOptions = parseOptions(tForm.options);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đố vui & Dự đoán</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* ── Trivia ── */}
      <h2 className="flex items-center gap-1 pt-2 text-lg font-bold">
        <HelpCircle size={18} /> Đố vui
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 flex items-center gap-1 font-semibold">
            <Plus size={16} /> {tEditId ? 'Sửa câu đố' : 'Tạo câu đố'}
          </h3>
          <form onSubmit={saveTrivia} className="space-y-2">
            <input
              className="input"
              placeholder="Câu hỏi"
              value={tForm.question}
              onChange={(e) => setTForm({ ...tForm, question: e.target.value })}
              required
            />
            <textarea
              className="input min-h-[90px]"
              placeholder="Các lựa chọn (mỗi dòng hoặc phân tách bởi dấu phẩy)"
              value={tForm.options}
              onChange={(e) => setTForm({ ...tForm, options: e.target.value })}
              required
            />
            <div className="flex gap-2">
              <select
                className="input"
                value={tForm.correctIndex}
                onChange={(e) => setTForm({ ...tForm, correctIndex: e.target.value })}
              >
                {triviaOptions.length === 0 && <option value="0">— Đáp án đúng —</option>}
                {triviaOptions.map((o, i) => (
                  <option key={i} value={i}>
                    {i}: {o}
                  </option>
                ))}
              </select>
              <input
                className="input w-28"
                type="number"
                min={0}
                placeholder="Coin thưởng"
                value={tForm.reward}
                onChange={(e) => setTForm({ ...tForm, reward: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                className="input w-44"
                type="date"
                value={tForm.activeDate}
                onChange={(e) => setTForm({ ...tForm, activeDate: e.target.value })}
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={tForm.isActive}
                  onChange={(e) => setTForm({ ...tForm, isActive: e.target.checked })}
                />
                Kích hoạt
              </label>
            </div>
            <p className="text-xs text-ink-400">Để trống ngày = câu đố luôn hiển thị (always-on).</p>
            <div className="flex gap-2">
              <button className="btn-primary">{tEditId ? 'Lưu' : 'Tạo'}</button>
              {tEditId && (
                <button
                  type="button"
                  onClick={resetTrivia}
                  className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800"
                >
                  Huỷ
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-500">
              <tr>
                <th className="p-3">Câu hỏi</th>
                <th className="p-3">Đáp án</th>
                <th className="p-3">Coin</th>
                <th className="p-3">Ngày</th>
                <th className="p-3">Hiện</th>
                <th className="p-3"></th>
              </tr>
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
                      <button onClick={() => startEditTrivia(q)} className="text-brand-600" title="Sửa">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteTrivia(q.id)} className="text-red-600" title="Xoá">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    Chưa có câu đố nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Predictions ── */}
      <h2 className="flex items-center gap-1 pt-4 text-lg font-bold">
        <TrendingUp size={18} /> Dự đoán
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 flex items-center gap-1 font-semibold">
            <Plus size={16} /> Tạo dự đoán
          </h3>
          <form onSubmit={createPred} className="space-y-2">
            <input
              className="input"
              placeholder="Tiêu đề"
              value={pForm.title}
              onChange={(e) => setPForm({ ...pForm, title: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Mô tả (tuỳ chọn)"
              value={pForm.description}
              onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
            />
            <textarea
              className="input min-h-[80px]"
              placeholder="Các phương án (mỗi dòng hoặc phân tách bởi dấu phẩy)"
              value={pForm.options}
              onChange={(e) => setPForm({ ...pForm, options: e.target.value })}
              required
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-500">Đóng lúc:</span>
              <input
                className="input"
                type="datetime-local"
                value={pForm.closesAt}
                onChange={(e) => setPForm({ ...pForm, closesAt: e.target.value })}
              />
            </div>
            <button className="btn-primary">Tạo</button>
          </form>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-500">
              <tr>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Pool</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {preds.map((p) => (
                <tr key={p.id} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="p-3">
                    {p.title}
                    {p.status === 'SETTLED' && p.correctIndex != null && (
                      <span className="ml-1 text-xs text-green-600">→ {p.options[p.correctIndex]}</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">{p.status}</td>
                  <td className="p-3 text-xs">{p.pool} ({p.betCount})</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {p.status === 'OPEN' && (
                        <button onClick={() => lockPred(p.id)} className="text-amber-600" title="Khoá">
                          <Lock size={15} />
                        </button>
                      )}
                      {p.status !== 'SETTLED' && (
                        <button onClick={() => settlePred(p)} className="text-green-600" title="Chốt kết quả">
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      <button onClick={() => deletePred(p.id)} className="text-red-600" title="Xoá">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {preds.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    Chưa có dự đoán nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
