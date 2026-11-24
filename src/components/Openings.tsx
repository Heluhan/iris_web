import { useEffect, useMemo, useState } from 'react';
import type { Job, Opening, OpeningsFile, Priority } from '../types';
import { PRIORITIES, TRACKS } from '../types';
import { fmtDate, toISO, uid } from '../util';
import { Empty } from './ui';

const PREP = [
  { name: 'Zetamac', url: 'https://arithmetic.zetamac.com/', what: 'timed mental math, like the online tests' },
  { name: 'Jane Street puzzles', url: 'https://www.janestreet.com/puzzles/', what: 'probability and logic practice' },
];

const isPhdOnly = (o: Opening) => o.degrees.length === 1 && o.degrees[0] === 'PhD';

function eligibilityOf(o: Opening): string {
  return [
    o.degrees.length ? `Degrees mentioned: ${o.degrees.join(', ')}.` : '',
    o.gradText ? `“${o.gradText}”` : '',
    o.sponsorship === 'yes' ? `Visa sponsorship: yes. “${o.sponsorText}”`
      : o.sponsorship === 'no' ? `Visa sponsorship: NO. “${o.sponsorText}”`
      : 'Visa sponsorship: not stated. Ask the recruiter if she needs CPT.',
    o.manual ? 'Found by hand, not on a job feed: confirm the posting is open.' : '',
  ].filter(Boolean).join('\n');
}

export function jobFromOpening(o: Opening): Job {
  const now = Date.now();
  return {
    id: uid(), firm: o.firm, title: o.title, track: o.track, location: o.location, url: o.url,
    deadline: o.deadline, priority: o.priority, stage: 'saved', appliedOn: '', resumeId: '', events: [],
    notes: '', eligibility: eligibilityOf(o), sourceId: o.id, createdAt: now, updatedAt: now,
  };
}

interface Props {
  jobs: Job[];
  onTrack: (o: Opening) => void;
  onOpenJob: (id: string) => void;
}

export function Openings({ jobs, onTrack, onOpenJob }: Props) {
  const [data, setData] = useState<OpeningsFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState<Priority | 0>(0);
  const [mastersOnly, setMastersOnly] = useState(false);
  const [hideNoVisa, setHideNoVisa] = useState(false);

  useEffect(() => {
    fetch('./openings.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const trackedJob = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jobs) {
      if (j.sourceId) m.set(j.sourceId, j.id);
      if (j.url) m.set(j.url, j.id);
    }
    return (o: Opening) => m.get(o.id) ?? m.get(o.url);
  }, [jobs]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.jobs.filter((o) =>
      (!needle || `${o.firm} ${o.title} ${o.location}`.toLowerCase().includes(needle)) &&
      (!prio || o.priority === prio) &&
      (!mastersOnly || !isPhdOnly(o)) &&
      (!hideNoVisa || o.sponsorship !== 'no'));
  }, [data, q, prio, mastersOnly, hideNoVisa]);

  if (failed) {
    return <div className="page"><Empty title="No openings loaded">Run <code>npm run scrape</code> in the project folder, then reload.</Empty></div>;
  }
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>;

  const manualFirms = data.firms.filter((f) => f.status !== 'scraped');
  const count = (p: Priority) => data.jobs.filter((o) => o.priority === p).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Find internships</h1>
          <p className="muted">{data.jobs.length} US Summer 2027 roles at her target firms · updated {fmtDate(toISO(new Date(data.scrapedAt)))}</p>
        </div>
      </header>

      <div className="filters">
        <input className="search" type="search" placeholder="Search firm, role or city" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Priority">
          <button className={`chip${prio === 0 ? ' chip-on' : ''}`} onClick={() => setPrio(0)}>All</button>
          {([1, 2, 3, 4] as Priority[]).map((p) => (
            <button key={p} className={`chip${prio === p ? ' chip-on' : ''}`} onClick={() => setPrio(p)} title={PRIORITIES[p]}>
              P{p} <span className="chip-count">{count(p)}</span>
            </button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={mastersOnly} onChange={(e) => setMastersOnly(e.target.checked)} />Hide PhD-only</label>
        <label className="check"><input type="checkbox" checked={hideNoVisa} onChange={(e) => setHideNoVisa(e.target.checked)} />Hide “no sponsorship”</label>
      </div>

      {rows.length === 0 && <Empty title="No roles match" />}
      {([1, 2, 3, 4] as Priority[]).map((p) => {
        const items = rows.filter((o) => o.priority === p);
        if (!items.length) return null;
        return (
          <section key={p} className="group">
            <h2 className="group-title">P{p} · {PRIORITIES[p]} <span className="muted">{items.length}</span></h2>
            <ul className="list">
              {items.map((o) => {
                const tracked = trackedJob(o);
                return (
                  <li key={o.id} className="op">
                    <div className="op-main">
                      <span className="op-firm">{o.firm}</span>
                      <a className="op-title" href={o.url} target="_blank" rel="noreferrer">{o.title}</a>
                      <span className="op-meta">
                        {[o.location, TRACKS[o.track]].filter(Boolean).join(' · ')}
                        {isPhdOnly(o) && <span className="flag flag-warn">PhD only</span>}
                        {o.sponsorship === 'yes' && <span className="flag flag-good" title={o.sponsorText}>Sponsors visas</span>}
                        {o.sponsorship === 'no' && <span className="flag flag-bad" title={o.sponsorText}>No sponsorship</span>}
                        {o.noExpNeeded && <span className="flag flag-good">No experience needed</span>}
                        {o.manual && <span className="flag flag-warn" title="Not on a job feed; confirm it's open">Unverified</span>}
                      </span>
                      {o.gradText && <span className="op-quote" title={o.gradText}>{o.gradText}</span>}
                    </div>
                    {tracked ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpenJob(tracked)}>Tracked ✓</button>
                    ) : (
                      <button className="btn btn-sm" onClick={() => onTrack(o)}>Track</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <details className="details">
        <summary>{manualFirms.length} firms to check by hand</summary>
        <p className="muted small">These firms have no job feed to read automatically. Check their careers pages every week or so.</p>
        <ul className="link-list">
          {manualFirms.map((f) => (
            <li key={f.name}>
              <a href={f.careers} target="_blank" rel="noreferrer">{f.name} ↗</a>
              <span className="muted small"> P{f.priority}{f.note ? ` · ${f.note}` : ''}</span>
            </li>
          ))}
        </ul>
      </details>
      <details className="details">
        <summary>Interview prep</summary>
        <ul className="link-list">
          {PREP.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a> <span className="muted small">{r.what}</span></li>)}
          <li><strong>A Practical Guide to Quantitative Finance Interviews</strong> <span className="muted small">(Zhou), the standard question book</span></li>
        </ul>
      </details>
    </div>
  );
}
