import type { Job, Priority, Stage } from './types';

// Earlier versions had 8 stages and a "chance" rating; fold them into the simpler model.
const STAGE: Record<string, Stage> = {
  saved: 'saved', applied: 'applied',
  oa: 'interviewing', interview: 'interviewing', final: 'interviewing', interviewing: 'interviewing',
  offer: 'offer', rejected: 'closed', withdrawn: 'closed', closed: 'closed',
};
const FIT_TO_PRIORITY: Record<string, Priority> = { good: 1, match: 3, reach: 4 };

export function migrateJobs(raw: unknown): Job[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((j: any): Job => ({
    id: j.id,
    firm: j.firm ?? '',
    title: j.title ?? '',
    track: j.track ?? 'trader',
    location: j.location ?? '',
    url: j.url ?? '',
    deadline: j.deadline ?? '',
    priority: j.priority ?? FIT_TO_PRIORITY[j.fit] ?? 3,
    stage: STAGE[j.stage] ?? 'saved',
    appliedOn: j.appliedOn ?? '',
    resumeId: j.resumeId ?? '',
    events: Array.isArray(j.events) ? j.events : [],
    notes: [j.notes, j.description].filter(Boolean).join('\n\n'),
    eligibility: j.eligibility ?? '',
    sourceId: j.sourceId,
    createdAt: j.createdAt ?? Date.now(),
    updatedAt: j.updatedAt ?? Date.now(),
  }));
}
