import { useEffect, useState } from 'react';
import type { Job, Priority, Stage } from '../types';
import { PRIORITIES, STAGES } from '../types';
import type { Resumes } from '../store';
import { fmtDate, toISO, uid } from '../util';
import { DateBadge } from './ui';

const DATE_PRESETS = ['Online test due', 'Phone interview', 'Video interview', 'Superday', 'Offer deadline', 'Follow up'];

interface Props {
  job: Job;
  resumes: Resumes;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Job>) => void;
  onStage: (id: string, stage: Stage) => void;
  onDelete: (id: string) => void;
  onGoResumes: () => void;
}

export function JobDrawer({ job, resumes, onClose, onUpdate, onStage, onDelete, onGoResumes }: Props) {
  const set = (patch: Partial<Job>) => onUpdate(job.id, patch);
  const [pick, setPick] = useState(job.resumeId || resumes.defaultId);
  const [evDate, setEvDate] = useState('');
  const [evLabel, setEvLabel] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => setPick(job.resumeId || resumes.defaultId), [job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEvent = () => {
    if (!evDate || !evLabel.trim()) return;
    set({ events: [...job.events, { id: uid(), date: evDate, label: evLabel.trim() }] });
    setEvDate('');
    setEvLabel('');
  };
  const events = [...job.events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="overlay overlay-drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-label={`${job.firm}: ${job.title}`}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow">Priority {job.priority}{job.location && ` · ${job.location}`}</p>
            <h2>{job.firm}</h2>
            <p className="drawer-title">{job.title}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="drawer-body">
          <div className="row">
            <select className="stage-select" value={job.stage} onChange={(e) => onStage(job.id, e.target.value as Stage)} aria-label="Stage">
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {job.url && <a className="btn btn-ghost" href={job.url} target="_blank" rel="noreferrer">View posting ↗</a>}
          </div>

          {/* Apply */}
          {job.stage === 'saved' ? (
            <section className="apply">
              <h3>Apply{job.deadline && <> · due <DateBadge date={job.deadline} /></>}</h3>
              {resumes.list.length === 0 ? (
                <p className="small">No resume uploaded yet. <button className="link" onClick={onGoResumes}>Add one</button> to pick it here.</p>
              ) : (
                <div className="row">
                  <label className="inline-label" htmlFor="resume-pick">Resume</label>
                  <select id="resume-pick" value={pick} onChange={(e) => setPick(e.target.value)}>
                    {resumes.list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button className="btn btn-ghost" disabled={!pick} onClick={() => resumes.save(pick)}>Download</button>
                </div>
              )}
              <div className="row">
                {job.url && <a className="btn btn-ghost" href={job.url} target="_blank" rel="noreferrer">Open application ↗</a>}
                <button className="btn" onClick={() => { onStage(job.id, 'applied'); set({ resumeId: pick }); }}>Mark as applied</button>
              </div>
            </section>
          ) : (
            <p className="applied-line">
              Applied {job.appliedOn ? fmtDate(job.appliedOn) : ''} with{' '}
              <select value={job.resumeId} onChange={(e) => set({ resumeId: e.target.value })} aria-label="Resume sent">
                <option value="">(not recorded)</option>
                {resumes.list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </p>
          )}

          {job.eligibility && (
            <section>
              <h3>Eligibility</h3>
              <p className="eligibility">{job.eligibility}</p>
            </section>
          )}

          {/* Dates */}
          <section>
            <h3>Dates</h3>
            {events.length > 0 && (
              <ul className="timeline">
                {events.map((ev) => (
                  <li key={ev.id} className={ev.done ? 'done' : ''}>
                    <input
                      type="checkbox"
                      checked={!!ev.done}
                      aria-label="Done"
                      onChange={() => set({ events: job.events.map((x) => (x.id === ev.id ? { ...x, done: !x.done } : x)) })}
                    />
                    <span className="tl-label">{ev.label}</span>
                    {ev.done ? <span className="muted small">{fmtDate(ev.date)}</span> : <DateBadge date={ev.date} />}
                    <button className="icon-btn" aria-label="Remove" onClick={() => set({ events: job.events.filter((x) => x.id !== ev.id) })}>×</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="row">
              <input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} aria-label="Date" />
              <input
                className="grow"
                list="date-presets"
                placeholder="e.g. Online test due"
                value={evLabel}
                onChange={(e) => setEvLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                aria-label="What"
              />
              <datalist id="date-presets">{DATE_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
              <button className="btn btn-ghost" onClick={addEvent} disabled={!evDate || !evLabel.trim()}>Add</button>
            </div>
          </section>

          <section>
            <h3>Notes</h3>
            <textarea rows={5} placeholder="Contacts, questions they asked, what to prep…" value={job.notes} onChange={(e) => set({ notes: e.target.value })} />
          </section>

          <details className="details">
            <summary>Edit details</summary>
            <div className="form-grid">
              <label>Firm<input value={job.firm} onChange={(e) => set({ firm: e.target.value })} /></label>
              <label>Role<input value={job.title} onChange={(e) => set({ title: e.target.value })} /></label>
              <label>Location<input value={job.location} onChange={(e) => set({ location: e.target.value })} /></label>
              <label>Deadline<input type="date" value={job.deadline} onChange={(e) => set({ deadline: e.target.value })} /></label>
              <label>Priority
                <select value={job.priority} onChange={(e) => set({ priority: Number(e.target.value) as Priority })}>
                  {([1, 2, 3, 4] as Priority[]).map((p) => <option key={p} value={p}>P{p} · {PRIORITIES[p]}</option>)}
                </select>
              </label>
              <label>Posting link<input type="url" value={job.url} onChange={(e) => set({ url: e.target.value })} /></label>
            </div>
            <div className="drawer-foot">
              <span className="muted small">Added {fmtDate(toISO(new Date(job.createdAt)))}</span>
              <button className="btn btn-danger" onClick={() => confirm(`Remove ${job.firm}: ${job.title}?`) && onDelete(job.id)}>Remove job</button>
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}
