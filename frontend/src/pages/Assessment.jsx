import React, { useEffect, useState } from 'react';
import { useBranding } from '../context/BrandingContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Assessment() {
  const { orgName } = useBranding();
  const [stage, setStage] = useState('intake'); // intake | test | result
  const [intake, setIntake] = useState({ name: '', email: '', phone: '' });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function startTest(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/public/assessment/questions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not load the assessment');
      setQuestions(data.questions);
      setStage('test');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionId, index) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/public/assessment/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...intake, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong submitting your assessment');
      setResult(data);
      setStage('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;

  if (stage === 'result' && result) {
    const band = result.score_pct >= 85 ? { label: 'Strong', color: 'text-teal' }
      : result.score_pct >= 70 ? { label: 'Good', color: 'text-gold' }
      : result.score_pct >= 50 ? { label: 'Fair', color: 'text-gold' }
      : { label: 'Needs Improvement', color: 'text-rust' };
    return (
      <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(600px circle at 50% 20%, rgba(217,164,65,0.16), transparent 60%)',
        }} />
        <div className="max-w-sm text-center relative animate-pop-in">
          <div className="font-mono text-6xl font-bold text-sand mb-2">{result.score_pct}%</div>
          <div className={`font-display font-semibold text-lg mb-4 ${band.color}`}>{band.label}</div>
          <p className="text-sand/60 text-sm">
            Thanks for completing the assessment, {intake.name.split(' ')[0]}. Your results have been recorded and someone from {orgName} will follow up on next steps.
          </p>
        </div>
      </div>
    );
  }

  if (stage === 'test') {
    return (
      <div className="min-h-screen bg-sand px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-sand/95 backdrop-blur py-2 z-10">
            <div>
              <h1 className="font-display font-bold text-xl">Skills Assessment</h1>
              <p className="text-ink/50 text-sm">{answeredCount} of {questions.length} answered</p>
            </div>
            <div className="w-32 h-2 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="card p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="font-mono text-xs text-ink/40 mt-0.5">{i + 1}.</span>
                <span className="font-medium text-sm">{q.question}</span>
              </div>
              <div className="space-y-2 pl-5">
                {q.options.map((opt, idx) => (
                  <label key={idx} className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 border cursor-pointer transition-colors ${
                    answers[q.id] === idx ? 'border-gold bg-gold/10' : 'border-black/10 hover:bg-black/[0.02]'
                  }`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === idx} onChange={() => selectAnswer(q.id, idx)} className="accent-gold" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {error && <div className="text-sm text-rust">{error}</div>}

          <div className="sticky bottom-4">
            <button
              onClick={submit}
              disabled={submitting || answeredCount < questions.length}
              className="btn-gold w-full py-3 shadow-lg"
            >
              {submitting ? 'Submitting…' : answeredCount < questions.length ? `Answer all questions to submit (${answeredCount}/${questions.length})` : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(600px circle at 50% 0%, rgba(217,164,65,0.16), transparent 60%), radial-gradient(500px circle at 100% 100%, rgba(46,156,143,0.12), transparent 60%)',
      }} />
      <div className="w-full max-w-md relative animate-fade-up">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-2xl text-sand tracking-tight">{orgName}</div>
          <div className="text-sand/50 text-sm uppercase tracking-widest mt-1">Skills & Aptitude Assessment</div>
        </div>
        <form onSubmit={startTest} className="card p-6 space-y-4">
          <p className="text-sm text-ink/60">
            This short assessment covers grammar, numerical reasoning, attention to detail, and workplace judgment. Your score is shown immediately after submitting.
          </p>
          <div>
            <label className="label">Full Name</label>
            <input required className="input" value={intake.name} onChange={(e) => setIntake({ ...intake, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input" value={intake.email} onChange={(e) => setIntake({ ...intake, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" value={intake.phone} onChange={(e) => setIntake({ ...intake, phone: e.target.value })} />
          </div>
          {error && <div className="text-sm text-rust">{error}</div>}
          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? 'Loading…' : 'Start Assessment'}
          </button>
        </form>
      </div>
    </div>
  );
}
