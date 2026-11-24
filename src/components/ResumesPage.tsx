import { useRef, useState } from 'react';
import type { Job } from '../types';
import type { Resumes } from '../store';
import { fmtDate, fmtSize, toISO } from '../util';

export function ResumesPage({ resumes, jobs, onOpenJob }: { resumes: Resumes; jobs: Job[]; onOpenJob: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await resumes.add(f);
    } catch {
      alert('Could not save that file in this browser.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1>Resumes</h1>
          <p className="muted">Keep each version here. When she applies, the app records which one was sent. Files stay in this browser.</p>
        </div>
      </header>

      {resumes.list.length > 0 && (
        <ul className="list">
          {resumes.list.map((r) => {
            const used = jobs.filter((j) => j.resumeId === r.id);
            const isDefault = resumes.defaultId === r.id;
            return (
              <li key={r.id} className="resume">
                <div className="resume-main">
                  <input className="resume-name" value={r.name} onChange={(e) => resumes.rename(r.id, e.target.value)} aria-label="Resume name" />
                  <p className="muted small">
                    {isDefault && <span className="flag flag-good">Default</span>}
                    {fmtSize(r.size)} · added {fmtDate(toISO(new Date(r.uploadedAt)))}
                    {used.length > 0 && <> · sent to {used.map((j, i) => (
                      <span key={j.id}>{i > 0 && ', '}<button className="link" onClick={() => onOpenJob(j.id)}>{j.firm}</button></span>
                    ))}</>}
                  </p>
                </div>
                <div className="row">
                  <button className="btn btn-ghost btn-sm" onClick={() => resumes.view(r.id)}>View</button>
                  {!isDefault && <button className="btn btn-ghost btn-sm" onClick={() => resumes.setDefaultId(r.id)}>Make default</button>}
                  <button className="icon-btn" aria-label={`Delete ${r.name}`}
                    onClick={() => confirm(`Delete "${r.name}"?`) && resumes.remove(r.id)}>×</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className={`dropzone${dragging ? ' dropzone-on' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={input} type="file" accept=".pdf,.doc,.docx" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <strong>{busy ? 'Saving…' : resumes.list.length ? '+ Add another version' : '+ Upload resume'}</strong>
        <span className="muted small">Drop a PDF here or click to choose</span>
      </div>
    </div>
  );
}
