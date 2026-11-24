import { useState } from 'react';
import type { Job, Stage } from '../types';
import { STAGES } from '../types';
import { collectDue, daysUntil, fmtDate, nextDate } from '../util';
import { DateBadge, Empty, PriorityTag } from './ui';

const NEXT: Partial<Record<Stage, Stage>> = { saved: 'applied', applied: 'interviewing', interviewing: 'offer' };

interface Props {
  jobs: Job[];
  onOpen: (id: string) => void;
  onStage: (id: string, stage: Stage) => void;
  onToggleEvent: (jobId: string, eventId: string) => void;
  onAdd: () => void;
  onFind: () => void;
}

export function Applications({ jobs, onOpen, onStage, onToggleEvent, onAdd, onFind }: Props) {
  const [over, setOver] = useState<Stage | null>(null);
  const [showAllDue, setShowAllDue] = useState(false);

  if (jobs.length === 0) {
    return (
      <div className="page">
        <Empty
          title="Nothing tracked yet"
          action={<div className="row center"><button className="btn" onClick={onFind}>Find internships</button><button className="btn btn-ghost" onClick={onAdd}>Add one manually</button></div>}
        >
          Pick internships from her target firms to start tracking deadlines and applications.
        </Empty>
      </div>
    );
  }

  const due = collectDue(jobs).filter((d) => daysUntil(d.date) <= 14);
  const shownDue = showAllDue ? due : due.slice(0, 5);
  const applied = jobs.filter((j) => j.appliedOn).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Applications</h1>
          <p className="muted">{jobs.length} tracked · {applied} applied</p>
        </div>
        <button className="btn btn-ghost" onClick={onAdd}>+ Add manually</button>
      </header>

      {due.length > 0 && (
        <section className="upnext">
          <h2>Coming up</h2>
          <ul>
            {shownDue.map((d) => (
              <li key={d.key}>
                {d.eventId ? (
                  <input type="checkbox" aria-label={`Mark "${d.label}" done`} onChange={() => onToggleEvent(d.job.id, d.eventId!)} />
                ) : <span className="upnext-spacer" />}
                <button className="upnext-main" onClick={() => onOpen(d.job.id)}>
                  <strong>{d.job.firm}</strong> <span className="muted">{d.label}</span>
                </button>
                <DateBadge date={d.date} relative />
              </li>
            ))}
          </ul>
          {due.length > 5 && (
            <button className="link small" onClick={() => setShowAllDue(!showAllDue)}>
              {showAllDue ? 'Show less' : `Show ${due.length - 5} more`}
            </button>
          )}
        </section>
      )}

      <div className="board">
        {STAGES.map((col) => {
          const cards = jobs
            .filter((j) => j.stage === col.id)
            .sort((a, b) => a.priority - b.priority || (nextDate(a) || '9999').localeCompare(nextDate(b) || '9999'));
          return (
            <section
              key={col.id}
              className={`column${over === col.id ? ' column-over' : ''} column-${col.id}`}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) onStage(id, col.id);
                setOver(null);
              }}
            >
              <header className="column-head">
                <h3>{col.label}</h3>
                <span className="column-count">{cards.length}</span>
              </header>
              {cards.length === 0 && col.hint && <p className="column-hint">{col.hint}</p>}
              {cards.map((j) => {
                const nd = nextDate(j);
                const next = NEXT[j.stage];
                return (
                  <article
                    key={j.id}
                    className="card"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', j.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onClick={() => onOpen(j.id)}
                  >
                    <div className="card-top">
                      <span className="card-firm">{j.firm}</span>
                      <PriorityTag p={j.priority} />
                    </div>
                    <div className="card-title">{j.title}</div>
                    <div className="card-foot">
                      {nd ? <DateBadge date={nd} relative /> : j.appliedOn ? <span className="muted small">Applied {fmtDate(j.appliedOn)}</span> : <span />}
                      {next && (
                        <button
                          className="card-next"
                          title={`Move to ${STAGES.find((s) => s.id === next)!.label}`}
                          onClick={(e) => { e.stopPropagation(); onStage(j.id, next); }}
                        >→</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
