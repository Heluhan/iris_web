import { useCallback, useEffect, useState } from 'react';
import type { Job, Stage } from './types';
import { usePersistent, useResumes } from './store';
import { migrateJobs } from './migrate';
import { collectDue, daysUntil, withStage } from './util';
import { Applications } from './components/Applications';
import { Openings, jobFromOpening } from './components/Openings';
import { ResumesPage } from './components/ResumesPage';
import { JobDrawer } from './components/JobDrawer';
import { AddJob } from './components/AddJob';
import { Menu } from './components/Menu';

const TABS = [
  { id: 'applications', label: 'Applications' },
  { id: 'find', label: 'Find internships' },
  { id: 'resumes', label: 'Resumes' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function useHashTab(): [Tab, (t: Tab) => void] {
  const read = (): Tab => {
    const h = location.hash.slice(1);
    return (TABS.some((t) => t.id === h) ? h : 'applications') as Tab;
  };
  const [tab, setTab] = useState<Tab>(read);
  useEffect(() => {
    const on = () => setTab(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [tab, (t) => { location.hash = t; setTab(t); }];
}

export default function App() {
  const [jobs, setJobs] = usePersistent<Job[]>('iris.jobs', () => [], migrateJobs);
  const resumes = useResumes();
  const [tab, setTab] = useHashTab();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const updateJob = (id: string, patch: Partial<Job>) =>
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j)));
  const setStage = (id: string, stage: Stage) =>
    setJobs((js) => js.map((j) => (j.id === id && j.stage !== stage ? withStage(j, stage) : j)));
  const toggleEvent = (jobId: string, eventId: string) =>
    setJobs((js) => js.map((j) => j.id !== jobId ? j : {
      ...j, events: j.events.map((e) => (e.id === eventId ? { ...e, done: !e.done } : e)), updatedAt: Date.now(),
    }));
  const closeDrawer = useCallback(() => setOpenId(null), []);

  const openJob = jobs.find((j) => j.id === openId);
  const urgent = collectDue(jobs).filter((d) => daysUntil(d.date) <= 3).length;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden><rect width="32" height="32" rx="8" fill="var(--accent)" /><path d="M9 21l5-6 4 3 5-8" stroke="var(--on-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Iris
        </span>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' tab-on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
              {t.id === 'applications' && urgent > 0 && <span className="tab-badge" title={`${urgent} due within 3 days`}>{urgent}</span>}
            </button>
          ))}
        </nav>
        <Menu jobs={jobs} setJobs={setJobs} resumes={resumes} notify={setToast} />
      </header>

      <main>
        {tab === 'applications' && (
          <Applications jobs={jobs} onOpen={setOpenId} onStage={setStage} onToggleEvent={toggleEvent}
            onAdd={() => setAdding(true)} onFind={() => setTab('find')} />
        )}
        {tab === 'find' && (
          <Openings jobs={jobs} onOpenJob={setOpenId}
            onTrack={(o) => { setJobs((js) => [jobFromOpening(o), ...js]); setToast(`Added ${o.firm} to Applications.`); }} />
        )}
        {tab === 'resumes' && <ResumesPage resumes={resumes} jobs={jobs} onOpenJob={setOpenId} />}
      </main>

      {openJob && (
        <JobDrawer
          job={openJob}
          resumes={resumes}
          onClose={closeDrawer}
          onUpdate={updateJob}
          onStage={setStage}
          onDelete={(id) => { setJobs((js) => js.filter((j) => j.id !== id)); setOpenId(null); }}
          onGoResumes={() => { setOpenId(null); setTab('resumes'); }}
        />
      )}
      {adding && (
        <AddJob onClose={() => setAdding(false)} onAdd={(j) => { setJobs((js) => [j, ...js]); setAdding(false); setOpenId(j.id); }} />
      )}
      {toast && <p className="toast" role="status">{toast}</p>}
    </div>
  );
}
