export type Stage = 'saved' | 'applied' | 'interviewing' | 'offer' | 'closed';

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'saved', label: 'To apply', hint: 'Not sent yet' },
  { id: 'applied', label: 'Applied', hint: 'Waiting to hear back' },
  { id: 'interviewing', label: 'Interviewing', hint: 'Tests, interviews, superday' },
  { id: 'offer', label: 'Offer', hint: '' },
  { id: 'closed', label: 'Closed', hint: 'Rejected or withdrawn' },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;

/** Her own target-list tiers. */
export type Priority = 1 | 2 | 3 | 4;
export const PRIORITIES: Record<Priority, string> = {
  1: 'Apply now',
  2: 'Within two weeks',
  3: 'Worth pursuing',
  4: 'Reach',
};

export type Track = 'trader' | 'research' | 'dev' | 'program';
export const TRACKS: Record<Track, string> = {
  trader: 'Trading',
  research: 'Research',
  dev: 'Quant dev',
  program: 'Program',
};

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  done?: boolean;
}

export interface Job {
  id: string;
  firm: string;
  title: string;
  track: Track;
  location: string;
  url: string;
  deadline: string; // YYYY-MM-DD or ''
  priority: Priority;
  stage: Stage;
  appliedOn: string;
  resumeId: string;
  events: TimelineEvent[];
  notes: string;
  /** Eligibility facts copied from the posting (degree, sponsorship, graduation window). */
  eligibility: string;
  /** id of the scraped opening this job came from */
  sourceId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ResumeMeta {
  id: string;
  name: string;
  fileName: string;
  size: number;
  type: string;
  uploadedAt: number;
}

/** A posting found by `npm run scrape` (public/openings.json). */
export interface Opening {
  id: string;
  firm: string;
  priority: Priority;
  title: string;
  location: string;
  url: string;
  posted: string;
  track: Track;
  season: string;
  degrees: string[];
  gradText: string;
  sponsorship: 'yes' | 'no' | 'unknown';
  sponsorText: string;
  deadline: string;
  deadlineText: string;
  noExpNeeded: boolean;
  manual?: boolean;
}

export interface FirmStatus {
  name: string;
  priority: Priority;
  careers: string;
  note: string;
  status: 'scraped' | 'manual' | 'error';
  total: number;
  matched: number;
}

export interface OpeningsFile {
  scrapedAt: string;
  firms: FirmStatus[];
  jobs: Opening[];
}
