import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminAssessment() {
  const [tab, setTab] = useState('attempts'); // attempts | questions
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/assessment`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Skills Assessment</h1>
          <p className="text-ink/50 text-sm mt-1">Send candidates a link, review their scores here.</p>
        </div>
        <button onClick={copyLink} className="btn-ghost border border-black/10">{copied ? 'Link copied ✓' : 'Copy Assessment Link'}</button>
      </div>

      <div className="flex gap-2 border-b border-black/10">
        {['attempts', 'questions'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-gold text-ink' : 'border-transparent text-ink/50 hover:text-ink'}`}
          >
            {t === 'attempts' ? 'Results' : 'Question Bank'}
          </button>
        ))}
      </div>

      {tab === 'attempts' ? <AttemptsList /> : <QuestionBank />}
    </div>
  );
}

function AttemptsList() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  async function load() {
    const { attempts } = await api.get('/assessment/attempts');
    setAttempts(attempts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openDetail(a) {
    const data = await api.get(`/assessment/attempts/${a.id}`);
    setDetail(data);
  }

  if (loading) return <div className="text-ink/50">Loading results…</div>;

  return (
    <div className="card divide-y divide-black/5">
      {attempts.map((a) => (
        <button key={a.id} onClick={() => openDetail(a)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/[0.02]">
          <div>
            <div className="font-medium text-sm">{a.name}</div>
            <div className="text-xs text-ink/50">{a.email} · {new Date(a.created_at).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-3">
            {a.matched_applicant_id && <span className="pill bg-ink/5 text-ink/60">in pipeline</span>}
            <span className={`font-mono text-lg font-semibold ${a.score_pct >= 70 ? 'text-teal' : a.score_pct >= 50 ? 'text-gold' : 'text-rust'}`}>{a.score_pct}%</span>
          </div>
        </button>
      ))}
      {attempts.length === 0 && <div className="px-4 py-6 text-sm text-ink/40 text-center">No one has taken the assessment yet.</div>}
      {detail && <AttemptDetailModal data={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AttemptDetailModal({ data, onClose }) {
  const { attempt, breakdown } = data;
  return (
    <Modal title={attempt.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-ink/50">{attempt.email}</div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-3xl font-bold ${attempt.score_pct >= 70 ? 'text-teal' : attempt.score_pct >= 50 ? 'text-gold' : 'text-rust'}`}>{attempt.score_pct}%</span>
          <span className="text-sm text-ink/50">{attempt.correct_count} of {attempt.total_questions} correct</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {breakdown.map((b, i) => (
            <div key={i} className={`text-sm p-3 rounded-md border ${b.was_correct ? 'border-teal/20 bg-teal/5' : 'border-rust/20 bg-rust/5'}`}>
              <div className="font-medium mb-1">{i + 1}. {b.question}</div>
              <div className="text-xs text-ink/60">
                Answered: {b.options[b.selected_index] ?? '—'} {!b.was_correct && <span>· Correct: {b.options[b.correct_index]}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const { questions } = await api.get('/assessment/questions');
    setQuestions(questions);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    await api.del(`/assessment/questions/${id}`);
    load();
  }

  if (loading) return <div className="text-ink/50">Loading question bank…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-gold text-sm">+ Add Question</button>
      </div>
      <div className="card divide-y divide-black/5">
        {questions.map((q) => (
          <div key={q.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{q.question}</div>
                {q.category && <span className="pill bg-ink/5 text-ink/50 mt-1">{q.category}</span>}
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`text-xs px-2 py-1 rounded ${i === q.correct_index ? 'bg-teal/10 text-teal font-medium' : 'text-ink/50'}`}>
                      {i === q.correct_index && '✓ '}{opt}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => remove(q.id)} className="text-ink/30 hover:text-rust text-xs shrink-0">Remove</button>
            </div>
          </div>
        ))}
        {questions.length === 0 && <div className="px-4 py-6 text-sm text-ink/40 text-center">No questions yet.</div>}
      </div>
      {showAdd && <AddQuestionModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddQuestionModal({ onClose, onSaved }) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateOption(i, val) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function submit(e) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) { setError('At least 2 options are required'); return; }
    if (correctIndex >= cleanOptions.length) { setError('Select a valid correct answer'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/assessment/questions', { question: question.trim(), options: cleanOptions, correct_index: correctIndex, category: category.trim() || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Question" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Question</label><textarea required className="input" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
        <div><label className="label">Category</label><input className="input" placeholder="e.g. Grammar, Numerical, Judgment" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div>
          <label className="label">Options (mark the correct one)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="accent-teal shrink-0" />
                <input className="input" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        {error && <div className="text-sm text-rust">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Add Question'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
