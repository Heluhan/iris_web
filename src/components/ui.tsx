import type { ReactNode } from 'react';
import { daysUntil, fmtDate, relDays, urgency } from '../util';

/** A date with colour by urgency: red overdue, orange ≤3 days, yellow ≤7 days. */
export function DateBadge({ date, relative }: { date: string; relative?: boolean }) {
  const n = daysUntil(date);
  return (
    <span className={`date date-${urgency(n)}`} title={fmtDate(date, true)}>
      {relative ? relDays(n) : `${fmtDate(date)} · ${relDays(n).toLowerCase()}`}
    </span>
  );
}

export const PriorityTag = ({ p }: { p: number }) => (
  <span className={`prio prio-${p}`} title={`Priority ${p}`}>P{p}</span>
);

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
