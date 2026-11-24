import type { Job, Stage } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((parseISO(iso).getTime() - now.getTime()) / 86_400_000);
}

export function fmtDate(iso: string, withWeekday = false): string {
  if (!iso) return '';
  const d = parseISO(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

export function relDays(n: number): string {
  if (n < -1) return `${-n} days ago`;
  if (n === -1) return 'Yesterday';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 14) return `In ${n} days`;
  return `In ${Math.round(n / 7)} weeks`;
}

export type Urgency = 'overdue' | 'urgent' | 'soon' | 'later';
export function urgency(n: number): Urgency {
  if (n < 0) return 'overdue';
  if (n <= 3) return 'urgent';
  if (n <= 7) return 'soon';
  return 'later';
}

export const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 ** 2).toFixed(1)} MB`;

/** Moving a job to a new stage; stamps the applied date the first time it leaves "To apply". */
export function withStage(job: Job, stage: Stage): Job {
  const next: Job = { ...job, stage, updatedAt: Date.now() };
  if (stage !== 'saved' && stage !== 'closed' && !job.appliedOn) next.appliedOn = todayISO();
  if (stage === 'saved') next.appliedOn = '';
  return next;
}

export interface DueItem {
  key: string;
  job: Job;
  date: string;
  label: string;
  eventId?: string;
}

/** Every dated thing that still needs doing: application deadlines + open timeline events. */
export function collectDue(jobs: Job[]): DueItem[] {
  const items: DueItem[] = [];
  for (const job of jobs) {
    if (job.stage === 'closed') continue;
    if (job.stage === 'saved' && job.deadline) {
      items.push({ key: `${job.id}:ddl`, job, date: job.deadline, label: 'Application deadline' });
    }
    for (const ev of job.events) {
      if (!ev.done && ev.date) items.push({ key: ev.id, job, date: ev.date, label: ev.label, eventId: ev.id });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Earliest open date on a job, for sorting. */
export function nextDate(job: Job): string {
  return collectDue([job])[0]?.date ?? '';
}

const FIRMS: [RegExp, string][] = [
  [/janestreet/, 'Jane Street'],
  [/optiver/, 'Optiver'],
  [/(^|\.)sig\.com|susquehanna/, 'SIG'],
  [/imc\.com|imctrading/, 'IMC Trading'],
  [/akuna/, 'Akuna Capital'],
  [/flowtraders/, 'Flow Traders'],
  [/drw\.com/, 'DRW'],
  [/citadelsecurities/, 'Citadel Securities'],
  [/citadel/, 'Citadel'],
  [/hudsonrivertrading|hrt\.com/, 'Hudson River Trading'],
  [/fiverings/, 'Five Rings'],
  [/oldmission/, 'Old Mission'],
  [/jumptrading/, 'Jump Trading'],
  [/belvedere/, 'Belvedere Trading'],
  [/wolverine/, 'Wolverine Trading'],
  [/twosigma/, 'Two Sigma'],
  [/deshaw/, 'D. E. Shaw'],
  [/tower-?research/, 'Tower Research'],
  [/virtu/, 'Virtu Financial'],
  [/peak6/, 'PEAK6'],
  [/xtxmarkets/, 'XTX Markets'],
  [/davinci/, 'Da Vinci'],
  [/qube-rt/, 'Qube Research & Technologies'],
  [/millennium/, 'Millennium'],
  [/squarepoint/, 'Squarepoint'],
];

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/** Best guess of the firm name from a job link (handles Greenhouse/Lever/Workday boards). */
export function guessFirm(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return '';
  }
  const host = url.hostname.toLowerCase();
  const full = host + url.pathname.toLowerCase();
  for (const [re, name] of FIRMS) if (re.test(full)) return name;
  const seg = url.pathname.split('/').filter(Boolean)[0] ?? '';
  if (/greenhouse\.io|lever\.co|ashbyhq\.com/.test(host) && seg) return titleCase(seg);
  if (/myworkdayjobs\.com/.test(host)) return titleCase(host.split('.')[0]);
  const parts = host.replace(/^www\./, '').replace(/^(careers|jobs|boards)\./, '').split('.');
  return parts.length > 1 ? titleCase(parts[parts.length - 2]) : '';
}

export function download(filename: string, content: BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const icsEscape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** All-day calendar events for every open deadline and timeline item. */
export function buildICS(jobs: Job[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Iris//Internship Tracker//EN', 'CALSCALE:GREGORIAN'];
  for (const item of collectDue(jobs)) {
    const start = item.date.replace(/-/g, '');
    const d = new Date(item.date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.key}@iris-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${toISO(d).replace(/-/g, '')}`,
      `SUMMARY:${icsEscape(`${item.job.firm}: ${item.label}`)}`,
      `DESCRIPTION:${icsEscape(`${item.job.title}${item.job.url ? `\n${item.job.url}` : ''}`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
