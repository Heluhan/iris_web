#!/usr/bin/env node
/**
 * Scrape live US 2027 quant trading / research internships from the firms' own
 * job boards and write public/openings.json for the app's "Openings" tab.
 *
 *   npm run scrape
 *
 * Only public job-board APIs are used (Greenhouse, Lever, Ashby, Workday).
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { FIRMS } from './firms.mjs';

const OUT = new URL('../public/openings.json', import.meta.url);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// ---------------------------------------------------------------- fetching

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(45_000) });
      if (res.ok) return await res.text();
      last = new Error(`HTTP ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = e;
    }
    await sleep(800 * 2 ** attempt);
  }
  throw last;
}

async function getJSON(url, init = {}) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'user-agent': UA, accept: 'application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(90_000),
      });
      if (res.ok) return await res.json();
      last = new Error(`HTTP ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = e;
    }
    await sleep(800 * 2 ** attempt);
  }
  throw last;
}

/** Run async fns with limited concurrency. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

const decodeEntities = (s) =>
  s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const htmlToText = (html = '') =>
  decodeEntities(decodeEntities(html).replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

// ---------------------------------------------------------------- adapters
// Each adapter returns { total, list: [{ id, title, location, url, posted }], detail(job) → text }

const adapters = {
  async greenhouse({ slug }) {
    // content=true returns descriptions + custom fields (e.g. Jane Street's "Employment Type") in one call.
    const data = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
    return {
      total: data.jobs.length,
      list: data.jobs.map((j) => {
        const meta = Object.fromEntries((j.metadata ?? []).filter((m) => m.value != null && m.value !== '').map((m) => [m.name, Array.isArray(m.value) ? m.value.join(', ') : String(m.value)]));
        return {
          id: `gh-${slug}-${j.id}`,
          title: j.title,
          location: j.location?.name ?? '',
          url: j.absolute_url,
          posted: j.first_published ?? j.updated_at ?? '',
          meta,
          _text: htmlToText(j.content),
        };
      }),
      detail: async (job) => job._text,
    };
  },

  async lever({ slug }) {
    const data = await getJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    return {
      total: data.length,
      list: data.map((j) => ({
        id: `lv-${slug}-${j.id}`,
        title: j.text,
        location: [j.categories?.location, ...(j.categories?.allLocations ?? []), j.country === 'US' ? 'United States' : '']
          .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
        url: j.hostedUrl,
        posted: j.createdAt ? new Date(j.createdAt).toISOString() : '',
        _text: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain].join('\n'),
      })),
      detail: async (job) => job._text,
    };
  },

  async ashby({ slug }) {
    const data = await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    const jobs = data.jobs.filter((j) => j.isListed !== false);
    return {
      total: jobs.length,
      list: jobs.map((j) => ({
        id: `ab-${slug}-${j.id}`,
        title: j.title,
        location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location), j.address?.postalAddress?.addressCountry]
          .filter(Boolean).join(' / '),
        url: j.jobUrl,
        posted: j.publishedAt ?? '',
        _text: j.descriptionPlain ?? htmlToText(j.descriptionHtml),
      })),
      detail: async (job) => job._text,
    };
  },

  async workday({ host, tenant, site }) {
    const base = `https://${host}/wday/cxs/${tenant}/${site}`;
    const list = [];
    let total = 0;
    for (const searchText of ['intern', 'internship', 'summer']) {
      for (let offset = 0; offset < 200; offset += 20) {
        const d = await getJSON(`${base}/jobs`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText }),
        });
        total = Math.max(total, d.total ?? 0);
        for (const p of d.jobPostings ?? []) {
          if (list.some((x) => x._path === p.externalPath)) continue;
          list.push({
            id: `wd-${tenant}-${p.externalPath.split('_').pop()}`,
            title: p.title,
            location: p.locationsText ?? '',
            url: `https://${host}/${site}${p.externalPath}`,
            posted: p.postedOn ?? '',
            _path: p.externalPath,
          });
        }
        if (!d.jobPostings || d.jobPostings.length < 20) break;
      }
    }
    return {
      total,
      list,
      async detail(job) {
        const d = await getJSON(`${base}${job._path}`);
        const info = d.jobPostingInfo ?? {};
        if (info.additionalLocations?.length) job.location = [job.location, ...info.additionalLocations].join(' / ');
        if (info.location && /locations?$/i.test(job.location)) job.location = [info.location, ...(info.additionalLocations ?? [])].join(' / ');
        return htmlToText(info.jobDescription);
      },
    };
  },
  /** Pinpoint ATS: https://<account>.pinpointhq.com/postings.json */
  async pinpoint({ slug }) {
    const data = await getJSON(`https://${slug}.pinpointhq.com/postings.json`);
    const jobs = data.data ?? [];
    return {
      total: jobs.length,
      list: jobs.map((j) => ({
        id: `pp-${slug}-${j.id}`,
        title: j.title,
        location: [j.location?.name, j.location?.city, j.location?.province].filter(Boolean).join(', '),
        url: j.url ?? `https://${slug}.pinpointhq.com/postings/${j.id}`,
        posted: '',
        _text: Object.values(j).filter((v) => typeof v === 'string' && v.length > 40).map(htmlToText).join('\n'),
      })),
      detail: async (job) => job._text,
    };
  },

  /** Workable widget feed (titles + locations only). */
  async workable({ slug }) {
    const data = await getJSON(`https://apply.workable.com/api/v1/widget/accounts/${slug}`);
    return {
      total: data.jobs.length,
      list: data.jobs.map((j) => ({
        id: `wk-${slug}-${j.shortcode}`,
        title: j.title,
        location: [j.city, j.state, j.country].filter(Boolean).join(', '),
        url: j.url,
        posted: j.published_on ?? '',
        meta: { type: j.employment_type ?? '' },
      })),
      detail: async () => '',
    };
  },

  /** SIG's careers site (Jibe over iCIMS). */
  async sig() {
    const list = [];
    let total = 0;
    for (const keywords of ['intern', 'internship']) {
      for (let page = 1; page <= 10; page++) {
        const d = await getJSON(`https://careers.sig.com/api/jobs?keywords=${keywords}&page=${page}&limit=20`);
        total = Math.max(total, d.totalCount ?? 0);
        for (const { data: j } of d.jobs ?? []) {
          if (list.some((x) => x.id === `sig-${j.req_id}`)) continue;
          list.push({
            id: `sig-${j.req_id}`,
            title: j.title,
            location: [j.full_location, j.country].filter(Boolean).join(', '),
            url: `https://careers.sig.com/jobs/${j.slug ?? j.req_id}`,
            posted: j.posted_date ?? '',
            _text: htmlToText([j.description, j.qualifications].filter(Boolean).join('\n')),
          });
        }
        if (!d.jobs || d.jobs.length < 20) break;
      }
    }
    return { total, list, detail: async (job) => job._text };
  },

  /** D. E. Shaw's own site: job links on /careers, description JSON on each page. */
  async deshaw() {
    const html = await getText('https://www.deshaw.com/careers');
    const paths = [...new Set([...html.matchAll(/href="(\/careers\/[a-z0-9-]+-\d+)"/g)].map((m) => m[1]))];
    const titleFromPath = (p) => p.replace(/^\/careers\//, '').replace(/-\d+$/, '').replace(/-/g, ' ');
    return {
      total: paths.length,
      list: paths.map((p) => ({ id: `des-${p.split('-').pop()}`, title: titleFromPath(p), location: '', url: `https://www.deshaw.com${p}`, posted: '', _path: p })),
      async detail(job) {
        const page = await getText(job.url);
        const title = page.match(/<title>([^<|]+)/)?.[1]?.trim();
        if (title) job.title = decodeEntities(title);
        job.location = job.title.match(/\(([^)]+)\)/)?.[1] ?? 'New York';
        const nd = page.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
        if (!nd) return '';
        const strings = [];
        (function walk(o) { if (typeof o === 'string') { if (o.length > 60) strings.push(o); } else if (o && typeof o === 'object') Object.values(o).forEach(walk); })(JSON.parse(nd).props?.pageProps?.jobData);
        return strings.map(htmlToText).join('\n');
      },
    };
  },

  /** Avature career sites (Two Sigma): page through the HTML job list. */
  async avature({ base }) {
    const links = new Map();
    for (let offset = 0; offset < 400; offset += 10) {
      const html = await getText(`${base}/OpenRoles/?jobRecordsPerPage=10&jobOffset=${offset}`);
      const before = links.size;
      for (const m of html.matchAll(/href="([^"]*\/JobDetail\/([^"/]+)\/(\d+))"/g)) links.set(m[3], m[1].startsWith('http') ? m[1] : new URL(m[1], base).href);
      if (links.size === before) break;
    }
    const list = [...links].map(([id, url]) => {
      const slug = decodeURIComponent(url.split('/JobDetail/')[1].split('/')[0]);
      const m = slug.match(/^(.*?United-States)-(.*)$/);
      return {
        id: `av-${id}`,
        title: (m ? m[2] : slug).replace(/-/g, ' '),
        location: m ? m[1].replace(/-/g, ' ') : '',
        url,
        posted: '',
      };
    });
    return {
      total: list.length,
      list,
      async detail(job) {
        const page = await getText(job.url);
        const t = page.match(/<title>([^<]+)/)?.[1]?.split(' - ').slice(0, -2).join(' - ').trim();
        if (t) job.title = decodeEntities(t);
        const main = page.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? page;
        return htmlToText(main.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ''));
      },
    };
  },
};

// ---------------------------------------------------------------- filters

const INTERN = /\bintern(ship)?s?\b|co-?op\b|\bsummer\b|externship|sneak peek|insight|discovery|bootcamp|\bspark\b|launchpad|\bwinter (program|quarter)\b|\bfellowship\b/i;
const SENIOR = /\b(senior|sr\.?|lead|principal|head of|director|vp|experienced|new grad|full[- ]time)\b/i;
const ROLE = /trad|quant|research|strateg|alpha|portfolio|investment|systematic|algorithm|options|derivatives|analyst|data scien|signal/i;
const DEV = /software|developer|engineer|devops|fpga|hardware|infrastructure|\bIT\b|technolog|security|network|support|systems|linux|windows|cyber/i;
const NON_QUANT = /accounting|legal|compliance|operations|marketing|recruit|human resources|\bpeople\b|audit|\btax\b|business development|communications|design|fund admin|investor relations|\bsales\b(?! (and|&) trading)|office|facilities|treasury|business analyst|\bMBA\b/i;
const US = /united states|\bUSA?\b|U\.S\.|new york|\bnyc\b|chicago|austin|boston|miami|philadelphia|bala cynwyd|radnor|jupiter|greenwich|stamford|san francisco|los angeles|berkeley|san mateo|palo alto|seattle|houston|dallas|denver|princeton|jersey city|red bank|charlotte|boca raton|palm beach|alamo|salt lake|washington|atlanta|baltimore|minneapolis|,\s*(NY|IL|TX|MA|FL|PA|CT|CA|NJ|WA|CO|NC|GA|MD|MN|UT|DC)\b/i;
const NON_US_ONLY = /london|amsterdam|sydney|hong kong|singapore|shanghai|beijing|shenzhen|mumbai|bangalore|gurgaon|paris|dublin|zug|zurich|geneva|frankfurt|tokyo|toronto|montreal|tel aviv|budapest|cyprus|limassol|warsaw|taipei|seoul|melbourne/i;

function yearOk(title) {
  // "grad 2028" / "class of 2028" describe the student, not the internship year.
  const years = title.replace(/(grad\w*|class of)\D{0,10}20\d\d/gi, '').match(/20\d\d/g) ?? [];
  return !years.length || years.includes('2027');
}

function isUS(location) {
  if (US.test(location)) return true;
  if (/remote/i.test(location) && !NON_US_ONLY.test(location)) return true;
  return false;
}

function classify(title) {
  if (/insight|discovery|sneak peek|bootcamp|\bspark\b|launchpad|externship|fellowship|(?<!internship )program/i.test(title)) return 'program';
  if (/software|developer|engineer\b|technologist/i.test(title) && !/research|algorithm/i.test(title)) return 'dev';
  if (/trad/i.test(title)) return 'trader';
  return 'research';
}

function matches(job, firm) {
  const t = job.title;
  const metaText = Object.values(job.meta ?? {}).join(' | ');
  // Custom fields only ever add matches (Jane Street titles interns "Quantitative Trader" with
  // Employment Type = "Summer Internship"); "Time Type: Full Time" on Point72 interns means hours.
  const internByMeta = /intern/i.test(metaText);
  if (!(INTERN.test(t) || internByMeta) || SENIOR.test(t) || !yearOk(t)) return false;
  if (firm.exclude && firm.exclude.test(t)) return false;
  if (!ROLE.test(t) || NON_QUANT.test(t)) return false;
  if (DEV.test(t) && !/trad|research|strateg|algorithm|quant/i.test(t)) return false;
  return true;
}

// ---------------------------------------------------------------- signals

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function parseDate(s = '') {
  let m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)/i);
  if (m) return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

function signals(text = '') {
  const flat = text.replace(/\s+/g, ' ');
  // Postings are mostly bullet lists without punctuation, so search line by line and
  // quote a short window around the match instead of a whole "sentence".
  const lines = text.split(/\n|(?<=[.!?])\s+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const find = (re) => {
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const start = Math.max(0, m.index - 70);
      const end = Math.min(line.length, m.index + m[0].length + 110);
      let snip = line.slice(start, end);
      if (start > 0) snip = '…' + snip.replace(/^\S*\s/, '');
      if (end < line.length) snip = snip.replace(/\s\S*$/, '') + '…';
      return snip;
    }
    return '';
  };

  // Words match case-insensitively; abbreviations (BS, MS, PhD…) case-sensitively.
  const degrees = [];
  if (/\b(bachelor|undergraduate|undergrad)/i.test(flat) || /\b(BS|B\.S\.|BA|B\.A\.|BSc|UG)\b/.test(flat)) degrees.push("Bachelor's");
  if (/\bmaster'?s\b|\bmasters\b|graduate degree/i.test(flat) || /\b(MS|M\.S\.|MSc|MFE|MFin|MEng|M\.Eng)\b/.test(flat)) degrees.push("Master's");
  if (/doctoral|doctorate|post-?doc/i.test(flat) || /\b(PhD|Ph\.D\.?)\b/.test(flat)) degrees.push('PhD');

  const sponsorText = find(/sponsor|work authori[sz]ation|authori[sz]ed to work|\bvisa\b|\bCPT\b|\bOPT\b/i);
  let sponsorship = 'unknown';
  if (/(not|unable to|will not|won't|cannot|can't|does not|do not)\b[^.]{0,60}sponsor|without (the need for )?(current or future |any )?(visa |employment )?sponsorship/i.test(flat)) sponsorship = 'no';
  else if (/(will|can|may|do|does)\s+(provide|offer|support)\s+(visa |immigration )?sponsorship|sponsorship (is )?available|we sponsor/i.test(flat)) sponsorship = 'yes';

  const deadlineText = find(/deadline|apply by|applications? (will )?(close|are due|due)|submit (your )?application(s)? by/i);
  const gradText = find(/graduat\w*[^.]{0,120}20(2[6-9]|3[0-1])|class of 20(2[6-9]|30)/i);

  return {
    degrees,
    gradText,
    sponsorship,
    sponsorText,
    deadline: parseDate(deadlineText),
    deadlineText,
    noExpNeeded:
      /no (prior )?(finance|financial|trading|industry) (background|experience|knowledge)|(finance|financial|trading) (background|experience|knowledge)\s+(is\s+)?(not required|unnecessary|not necessary)|no prior experience|never thought about a career in finance|teach you everything/i.test(flat),
  };
}

// ---------------------------------------------------------------- main

async function scrapeFirm(firm) {
  const result = {
    name: firm.name, priority: firm.priority, kind: firm.kind, targets: firm.targets ?? '',
    careers: firm.careers ?? '', note: firm.note ?? '', feeds: firm.feeds.map((f) => `${f.ats}:${f.slug ?? f.tenant ?? ''}`),
    status: firm.feeds.length ? 'scraped' : 'manual', total: 0, matched: 0, error: '', jobs: [],
  };
  for (const feed of firm.feeds) {
    try {
      const board = await adapters[feed.ats](feed);
      result.total += board.total;
      if (!result.careers) {
        result.careers =
          feed.ats === 'greenhouse' ? `https://job-boards.greenhouse.io/${feed.slug}`
          : feed.ats === 'lever' ? `https://jobs.lever.co/${feed.slug}`
          : feed.ats === 'ashby' ? `https://jobs.ashbyhq.com/${feed.slug}`
          : feed.ats === 'workday' ? `https://${feed.host}/${feed.site}`
          : feed.ats === 'pinpoint' ? `https://${feed.slug}.pinpointhq.com`
          : feed.ats === 'workable' ? `https://apply.workable.com/${feed.slug}`
          : feed.ats === 'sig' ? 'https://careers.sig.com'
          : feed.ats === 'deshaw' ? 'https://www.deshaw.com/careers'
          : feed.base ?? '';
      }
      const candidates = board.list.filter((j) => matches(j, firm));
      const detailed = await pool(candidates, 4, async (job) => {
        let text = '';
        try { text = await board.detail(job); } catch { /* keep the posting even without details */ }
        return { job, text };
      });
      for (const { job, text } of detailed) {
        if (!isUS(job.location) && !(job.location === '' && US.test(text.slice(0, 600)))) continue;
        const sig = signals(text);
        for (const [k, v] of Object.entries(job.meta ?? {})) {
          if (/deadline/i.test(k) && !sig.deadline) { sig.deadline = /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : parseDate(v); sig.deadlineText = `${k}: ${v}`; }
        }
        if (/\bPhD\b/.test(job.title) && !/\b(BS|MS|UG)\b/.test(job.title)) sig.degrees = ['PhD'];
        else {
          if (/\b(BS|UG|undergrad)/i.test(job.title) && !sig.degrees.includes("Bachelor's")) sig.degrees.unshift("Bachelor's");
          if (/\b(MS|master)/i.test(job.title) && !sig.degrees.includes("Master's")) sig.degrees.push("Master's");
        }
        const season = job.title.match(/\b(summer|winter|spring|fall)\s*(20\d\d)?/i)?.[0] ?? '';
        result.jobs.push({
          id: job.id,
          firm: firm.name,
          priority: firm.priority,
          title: job.title.trim(),
          location: job.location,
          url: job.url,
          posted: job.posted ? String(job.posted).slice(0, 10) : '',
          track: classify(job.title),
          season: season ? season.replace(/\s+/, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '',
          ...sig,
        });
      }
    } catch (e) {
      result.status = 'error';
      result.error = `${feed.ats}:${feed.slug ?? feed.tenant ?? ''} — ${e.message}`;
    }
  }
  for (const k of firm.known ?? []) {
    result.jobs.push({
      id: `known-${firm.name}-${k.title}`.toLowerCase().replace(/\W+/g, '-'),
      firm: firm.name, priority: firm.priority, title: k.title, location: k.location ?? '', url: k.url,
      posted: '', track: k.track ?? classify(k.title), season: 'Summer 2027', degrees: k.degrees ?? [],
      gradText: k.note ?? '', sponsorship: k.sponsorship ?? 'unknown', sponsorText: '', deadline: '', deadlineText: '',
      noExpNeeded: false, manual: true,
    });
  }
  result.matched = result.jobs.length;
  return result;
}

const started = Date.now();
const firms = await pool(FIRMS, 5, async (f) => {
  const r = await scrapeFirm(f);
  const tag = r.status === 'manual' ? 'manual ' : r.status === 'error' ? 'ERROR  ' : `${String(r.matched).padStart(3)}/${String(r.total).padEnd(3)}`;
  console.log(`${tag}  P${f.priority}  ${f.name}${r.error ? `  (${r.error})` : ''}`);
  return r;
});

// If a firm's feed failed this run (e.g. a site blocking CI servers), keep its last known openings.
let previous = { jobs: [] };
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
for (const f of firms) {
  if (f.status !== 'error') continue;
  f.jobs = previous.jobs.filter((j) => j.firm === f.name);
  f.matched = f.jobs.length;
  if (f.jobs.length) console.log(`  kept ${f.jobs.length} previous openings for ${f.name}`);
}

const jobs = firms.flatMap((f) => f.jobs).sort((a, b) => a.priority - b.priority || a.firm.localeCompare(b.firm));
const out = {
  scrapedAt: new Date().toISOString(),
  firms: firms.map(({ jobs: _j, ...f }) => f),
  jobs,
};
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 1));
console.log(`\n${jobs.length} matching US internships from ${firms.filter((f) => f.status === 'scraped').length} job boards ` +
  `(${firms.filter((f) => f.status === 'manual').length} firms to check by hand, ${firms.filter((f) => f.status === 'error').length} errors) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
