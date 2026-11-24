import { useState } from 'react';
import type { Job, Priority } from '../types';
import { PRIORITIES } from '../types';
import { guessFirm, uid } from '../util';
import { Modal } from './ui';

export function AddJob({ onAdd, onClose }: { onAdd: (j: Job) => void; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [firm, setFirm] = useState('');
  const [firmTouched, setFirmTouched] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>(3);

  const submit = () => {
    if (!firm.trim()) return;
    const now = Date.now();
    onAdd({
      id: uid(), firm: firm.trim(), title: title.trim() || 'Internship', track: /research/i.test(title) ? 'research' : 'trader',
      location: '', url: url.trim(), deadline, priority, stage: 'saved', appliedOn: '', resumeId: '',
      events: [], notes: '', eligibility: '', createdAt: now, updatedAt: now,
    });
  };

  return (
    <Modal
      title="Add a job"
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit} disabled={!firm.trim()}>Add</button>
      </>}
    >
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="span-2">Posting link
          <input
            autoFocus
            type="url"
            placeholder="Paste the link; the firm name fills in automatically"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (!firmTouched) setFirm(guessFirm(e.target.value)); }}
          />
        </label>
        <label>Firm<input value={firm} onChange={(e) => { setFirm(e.target.value); setFirmTouched(true); }} /></label>
        <label>Role<input placeholder="Quantitative Trader Intern" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Deadline <span className="muted">(optional)</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <label>Priority
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)}>
            {([1, 2, 3, 4] as Priority[]).map((p) => <option key={p} value={p}>P{p} · {PRIORITIES[p]}</option>)}
          </select>
        </label>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
