import { useEffect, useRef, useState } from 'react';
import type { Job, ResumeMeta } from '../types';
import type { Resumes } from '../store';
import { getBlob } from '../store';
import { migrateJobs } from '../migrate';
import { buildICS, collectDue, download, todayISO } from '../util';

interface Backup {
  app: 'iris-tracker';
  version: number;
  exportedAt: string;
  jobs: Job[];
  resumes: (ResumeMeta & { dataUrl?: string })[];
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

interface Props {
  jobs: Job[];
  setJobs: (j: Job[]) => void;
  resumes: Resumes;
  notify: (msg: string) => void;
}

/** "⋯" menu: calendar export and backup/restore. */
export function Menu({ jobs, setJobs, resumes, notify }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const exportCalendar = () => {
    const n = collectDue(jobs).length;
    if (!n) return notify('No deadlines or interview dates to export yet.');
    download(`iris-deadlines-${todayISO()}.ics`, buildICS(jobs), 'text/calendar');
    notify(`Exported ${n} dates. Open the file to add them to your calendar.`);
  };

  const exportBackup = async () => {
    const withFiles = await Promise.all(resumes.list.map(async (r) => {
      const b = await getBlob(r.id);
      return { ...r, dataUrl: b ? await toDataUrl(b) : undefined };
    }));
    const backup: Backup = { app: 'iris-tracker', version: 2, exportedAt: new Date().toISOString(), jobs, resumes: withFiles };
    download(`iris-backup-${todayISO()}.json`, JSON.stringify(backup), 'application/json');
    notify('Backup downloaded.');
  };

  const importBackup = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as Backup;
      if (data.app !== 'iris-tracker' || !Array.isArray(data.jobs)) throw new Error();
      if (!confirm(`Replace everything with this backup (${data.jobs.length} jobs, ${data.resumes.length} resumes)?`)) return;
      const blobs: Record<string, Blob> = {};
      for (const r of data.resumes) if (r.dataUrl) blobs[r.id] = await (await fetch(r.dataUrl)).blob();
      await resumes.replaceAll(data.resumes.map(({ dataUrl: _d, ...m }) => m), blobs);
      setJobs(migrateJobs(data.jobs));
      notify('Backup restored.');
    } catch {
      notify("That file isn't an Iris backup.");
    }
  };

  const item = (label: string, hint: string, fn: () => void) => (
    <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); fn(); }}>
      <span>{label}</span>
      <span className="muted small">{hint}</span>
    </button>
  );

  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn menu-btn" aria-label="More" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="menu-pop" role="menu">
          {item('Export to calendar', 'All deadlines and interview dates (.ics)', exportCalendar)}
          {item('Download backup', 'Jobs and resume files, to move devices', exportBackup)}
          {item('Restore backup…', 'Replaces what’s here', () => file.current?.click())}
        </div>
      )}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { importBackup(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
