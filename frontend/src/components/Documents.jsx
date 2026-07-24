import React, { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORY_LABELS = {
  certification: 'Certification',
  agreement: 'Signed Agreement',
  id_verification: 'ID Verification',
  other: 'Other',
};

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Documents({ userId, admin = false }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('certification');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { documents } = await api.get(`/documents${admin ? `?user_id=${userId}` : ''}`);
    setDocs(documents);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function upload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError('');
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('File must be under 8MB');
      const file_data = await readFileAsBase64(file);
      await api.post('/documents', {
        title: title.trim(),
        category,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_data,
        user_id: admin ? userId : undefined,
      });
      setTitle('');
      setFile(null);
      e.target.reset?.();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function download(doc) {
    const { document } = await api.get(`/documents/${doc.id}`);
    const link = window.document.createElement('a');
    link.href = `data:${document.mime_type};base64,${document.file_data}`;
    link.download = document.file_name;
    link.click();
  }

  async function remove(id) {
    await api.del(`/documents/${id}`);
    load();
  }

  if (loading) return <div className="text-ink/50 text-sm">Loading documents…</div>;

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold mb-1">Certifications & Documents</h2>
      <p className="text-xs text-ink/50 mb-4">Signed agreements, training certificates, and ID verification.</p>

      <div className="space-y-2 mb-4">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-black/5 last:border-0">
            <div>
              <button onClick={() => download(d)} className="font-medium hover:underline text-left">{d.title}</button>
              <div className="text-xs text-ink/40">{CATEGORY_LABELS[d.category]} · {d.file_name}</div>
            </div>
            <button onClick={() => remove(d.id)} className="text-ink/30 hover:text-rust text-xs">Remove</button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-ink/40">No documents uploaded yet.</p>}
      </div>

      <form onSubmit={upload} className="border-t border-black/10 pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="e.g. Excel Certification" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <input type="file" className="input" onChange={(e) => setFile(e.target.files[0] || null)} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
        {error && <div className="text-sm text-rust">{error}</div>}
        <button type="submit" disabled={uploading || !file || !title.trim()} className="btn-gold">
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
}
