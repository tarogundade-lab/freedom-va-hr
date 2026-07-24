import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function CompanyDocuments({ adminEditable = false }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { documents } = await api.get('/company-documents');
    setDocs(documents);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function readFileAsBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function upload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError('');
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('File must be under 15MB');
      const file_data = await readFileAsBase64(file);
      await api.post('/company-documents', { title: title.trim(), file_name: file.name, mime_type: file.type || 'application/octet-stream', file_data });
      setTitle(''); setFile(null); setShowUpload(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function download(doc) {
    const { document } = await api.get(`/company-documents/${doc.id}`);
    const link = window.document.createElement('a');
    link.href = `data:${document.mime_type};base64,${document.file_data}`;
    link.download = document.file_name;
    link.click();
  }

  async function remove(id) {
    await api.del(`/company-documents/${id}`);
    load();
  }

  if (loading) return null;
  if (!adminEditable && docs.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display font-semibold">Company Documents</h2>
          <p className="text-xs text-ink/50 mt-0.5">Policy manuals and shared reference materials.</p>
        </div>
        {adminEditable && !showUpload && (
          <button onClick={() => setShowUpload(true)} className="text-xs text-gold font-medium hover:underline shrink-0">+ Upload</button>
        )}
      </div>

      <div className="space-y-1 mb-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-black/5 last:border-0">
            <button onClick={() => download(d)} className="font-medium hover:underline text-left flex items-center gap-2">
              <span>📄</span> {d.title}
            </button>
            {adminEditable && <button onClick={() => remove(d.id)} className="text-ink/30 hover:text-rust text-xs">Remove</button>}
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-ink/40">No documents yet.</p>}
      </div>

      {adminEditable && showUpload && (
        <form onSubmit={upload} className="border-t border-black/10 pt-3 space-y-2">
          <input className="input" placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="file" className="input" onChange={(e) => setFile(e.target.files[0] || null)} accept=".pdf,.doc,.docx" />
          {error && <div className="text-sm text-rust">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowUpload(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={uploading || !file || !title.trim()} className="btn-gold text-sm">{uploading ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
