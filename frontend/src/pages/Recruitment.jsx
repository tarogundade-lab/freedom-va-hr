import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { parseCsv } from '../csv';

const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'training', label: 'In Training' },
  { key: 'hired', label: 'Hired' },
  { key: 'not_hired', label: 'Not Hired' },
];

function CopyApplyLink() {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="btn-ghost border border-black/10">
      {copied ? 'Link copied ✓' : 'Copy Apply Link'}
    </button>
  );
}

export default function Recruitment() {
  const [applicants, setApplicants] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  async function load() {
    const [a, c] = await Promise.all([api.get('/applicants'), api.get('/cohorts')]);
    setApplicants(a.applicants);
    setCohorts(c.cohorts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveStage(applicant, stage, extra = {}) {
    await api.post(`/applicants/${applicant.id}/stage`, { stage, ...extra });
    await load();
    setSelected(null);
    if (stage === 'hired') {
      setCelebrate(applicant.name);
      setTimeout(() => setCelebrate(null), 3000);
    }
  }

  if (loading) return <div className="text-ink/50">Loading pipeline…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Recruitment</h1>
          <p className="text-ink/50 text-sm mt-1">Track applicants from application through hire.</p>
        </div>
        <div className="flex gap-2">
          <CopyApplyLink />
          <button className="btn-ghost border border-black/10" onClick={() => setShowImport(true)}>Import CSV</button>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add Applicant</button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const items = applicants.filter((a) => a.stage === stage.key);
          return (
            <div key={stage.key} className="min-w-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/60">{stage.label}</span>
                <span className="font-mono text-xs text-ink/40">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="card p-3 text-left w-full hover:shadow-md transition-shadow"
                  >
                    <div className="font-medium text-sm truncate">{a.name}</div>
                    <div className="text-xs text-ink/50 truncate">{a.email}</div>
                    {a.cohort_name && <div className="pill bg-ink/5 text-ink/60 mt-2">{a.cohort_name}</div>}
                  </button>
                ))}
                {items.length === 0 && <div className="text-xs text-ink/30 px-1 py-4 text-center border border-dashed border-black/10 rounded-md">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>

      {celebrate && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
          <div className="card px-5 py-4 shadow-lg border-teal/30 bg-teal/5 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-medium text-sm">{celebrate} is hired!</div>
              <div className="text-xs text-ink/50">Welcome email sent, onboarding checklist assigned.</div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddApplicantModal cohorts={cohorts} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />
      )}
      {showImport && (
        <ImportCsvModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />
      )}
      {selected && (
        <ApplicantModal applicant={selected} cohorts={cohorts} onClose={() => setSelected(null)} onMove={moveStage} />
      )}
    </div>
  );
}

function ImportCsvModal({ onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(reader.result);
        if (parsed.length === 0) throw new Error('No rows found in file');
        setRows(parsed);
      } catch (err) {
        setError('Could not read that file: ' + err.message);
        setRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function doImport() {
    setImporting(true);
    setError('');
    try {
      const payload = rows.map((r) => ({
        name: r.name, email: r.email, phone: r.phone, source: r.source, cohort: r.cohort,
      }));
      const res = await api.post('/applicants/bulk-import', { rows: payload });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Import Applicants from CSV" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-xs text-ink/50 bg-black/[0.02] border border-black/10 rounded-md p-3">
          <div className="font-medium text-ink/70 mb-1">Expected columns:</div>
          <code className="text-[11px]">name, email, phone, source, cohort</code>
          <div className="mt-1">Only <code>name</code> and <code>email</code> are required. <code>cohort</code> should match an existing cohort's name exactly — otherwise the applicant is imported without one.</div>
        </div>

        <input type="file" accept=".csv" className="input" onChange={handleFile} />

        {rows.length > 0 && !result && (
          <div>
            <div className="text-sm font-medium mb-2">{rows.length} row{rows.length !== 1 ? 's' : ''} ready from {fileName}</div>
            <div className="max-h-48 overflow-y-auto border border-black/10 rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-black/[0.03] sticky top-0"><tr>
                  <th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Cohort</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="p-2">{r.name || <span className="text-rust">missing</span>}</td>
                      <td className="p-2">{r.email || <span className="text-rust">missing</span>}</td>
                      <td className="p-2">{r.cohort || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 8 && <div className="text-center text-ink/40 py-1 text-xs">+ {rows.length - 8} more</div>}
            </div>
          </div>
        )}

        {result && (
          <div className="text-sm space-y-1 bg-teal/5 border border-teal/20 rounded-md p-3">
            <div className="font-medium text-teal">{result.created} applicant{result.created !== 1 ? 's' : ''} imported</div>
            {result.skipped > 0 && <div className="text-rust">{result.skipped} row(s) skipped (missing name/email)</div>}
            {result.unmatched_cohorts?.length > 0 && (
              <div className="text-ink/60">Cohort names not found (imported without a cohort): {result.unmatched_cohorts.join(', ')}</div>
            )}
          </div>
        )}

        {error && <div className="text-sm text-rust">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button disabled={rows.length === 0 || importing} onClick={doImport} className="btn-gold">
              {importing ? 'Importing…' : `Import ${rows.length || ''} Applicant${rows.length !== 1 ? 's' : ''}`}
            </button>
          )}
          {result && <button onClick={onDone} className="btn-gold">Done</button>}
        </div>
      </div>
    </Modal>
  );
}

function AddApplicantModal({ cohorts, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', cohort_id: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/applicants', { ...form, cohort_id: form.cohort_id || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Add Applicant">
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="label">Source</label><input className="input" placeholder="e.g. Facebook post, referral" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
        <div>
          <label className="label">Training Cohort</label>
          <select className="input" value={form.cohort_id} onChange={(e) => setForm({ ...form, cohort_id: e.target.value })}>
            <option value="">— None yet —</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <div className="text-sm text-rust">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Add Applicant'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ApplicantModal({ applicant, cohorts, onClose, onMove }) {
  const [note, setNote] = useState('');
  const [createAccount, setCreateAccount] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [assessmentScore, setAssessmentScore] = useState(undefined); // undefined = loading, null = no attempt

  useEffect(() => {
    api.get('/assessment/attempts').then(({ attempts }) => {
      const match = attempts.find((a) => a.email.toLowerCase() === applicant.email.toLowerCase());
      setAssessmentScore(match || null);
    }).catch(() => setAssessmentScore(null));
  }, [applicant.email]);

  async function handleMove(stage) {
    setBusy(true);
    setError('');
    try {
      const extra = stage === 'hired' ? { create_account: createAccount, password: password || undefined } : { note: note || undefined };
      await onMove(applicant, stage, extra);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} title={applicant.name}>
      <div className="space-y-4">
        <div className="text-sm space-y-1">
          <div><span className="text-ink/50">Email:</span> {applicant.email}</div>
          {applicant.phone && <div><span className="text-ink/50">Phone:</span> {applicant.phone}</div>}
          {applicant.source && <div><span className="text-ink/50">Source:</span> {applicant.source}</div>}
          {applicant.cohort_name && <div><span className="text-ink/50">Cohort:</span> {applicant.cohort_name}</div>}
          {assessmentScore && (
            <div>
              <span className="text-ink/50">Assessment:</span>{' '}
              <span className={`font-mono font-semibold ${assessmentScore.score_pct >= 70 ? 'text-teal' : assessmentScore.score_pct >= 50 ? 'text-gold' : 'text-rust'}`}>
                {assessmentScore.score_pct}%
              </span>
            </div>
          )}
          {applicant.notes && <div className="pt-1 text-ink/70">{applicant.notes}</div>}
          <div className="pt-1"><span className="pill bg-ink text-sand">{applicant.stage.replace('_', ' ')}</span></div>
        </div>

        <div>
          <label className="label">Add a note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Great interview, strong communication" />
        </div>

        {applicant.stage !== 'hired' && applicant.stage !== 'not_hired' && (
          <div className="border border-black/10 rounded-md p-3 bg-black/[0.02]">
            <div className="text-xs font-medium mb-2">Moving to Hired will create their VA login:</div>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} />
              Create account automatically
            </label>
            {createAccount && (
              <input className="input" type="text" placeholder="Temporary password (optional, default provided)" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </div>
        )}

        {error && <div className="text-sm text-rust">{error}</div>}

        <div className="flex flex-wrap gap-2 pt-2">
          {STAGES.filter((s) => s.key !== applicant.stage).map((s) => (
            <button
              key={s.key}
              disabled={busy}
              onClick={() => handleMove(s.key)}
              className={s.key === 'hired' ? 'btn-gold' : s.key === 'not_hired' ? 'btn bg-rust/10 text-rust hover:bg-rust/20' : 'btn-ghost border border-black/10'}
            >
              Move to {s.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
