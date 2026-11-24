# Iris: quant internship tracker

A small tracker for applying to **US Summer 2027 quant trading internships**, built for someone new to quant.
It runs entirely in the browser: no account and no server. Data stays on the laptop she uses it on.

**Live:** https://heluhan.github.io/iris_web/

Openings refresh automatically every Monday (GitHub Action: scrape → build → deploy). To refresh now:
GitHub → Actions → *Scrape and deploy* → **Run workflow**, or `gh workflow run deploy.yml`.

## Run it locally

```bash
npm install
npm run scrape     # refresh live openings → public/openings.json (~1 min)
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (deploy to GitHub Pages, Netlify, Vercel…)
```

## Scraper (`npm run scrape`)
`scripts/firms.mjs` holds her 68-firm target list (priorities 1–4). For each firm that posts on a public
job board (Greenhouse, Lever, Ashby or Workday), `scripts/scrape.mjs` pulls every posting and keeps
**US internships for 2027 in trading / quant research** (and early-career programs). From each posting's text it extracts:
- **Degree levels** mentioned (Bachelor's / Master's / PhD); PhD-only roles are flagged
- **Graduation window** quote, e.g. "You will graduate between December 2027–June 2028"
- **Visa sponsorship / CPT**: yes, no, or not stated, with the exact sentence
- **Deadline** when one is stated, and whether it says no finance background is needed

Firms without a public feed are listed under "Check by hand" with their careers link. To add a firm,
find its job board (look for `boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`
or `*.myworkdayjobs.com` on its careers page) and add it to `firms.mjs`.

## How it works
Three tabs:

| Tab | What it's for |
| --- | --- |
| **Applications** | One board: To apply → Applied → Interviewing → Offer → Closed. Drag cards, or click → to move one forward. **Coming up** at the top lists anything due in the next 2 weeks. |
| **Find internships** | Scraped openings at her target firms, grouped by priority. Filter, then **Track** to add one to Applications. Firms to check by hand and interview prep are at the bottom. |
| **Resumes** | Every resume version. Each application records which one was sent. |

Click a card to open it:
1. **Apply**: pick a resume and **Download** it, **Open application ↗**, then **Mark as applied**.
2. **Dates**: online test, interviews, offer deadline. These feed Coming up and the calendar export.
3. **Eligibility**: degree, graduation window and visa sponsorship, copied from the posting.
4. **Notes**, plus **Edit details** if something's wrong.

The **⋯** menu (top right) exports dates to Google/Apple Calendar and backs up or restores everything,
including resume files. Use it to move to another device.

## Notes on the 2027 cycle (researched 2026-11-24)
- US only. Openings come from the firms' own job boards, so a posting there is the source of truth.
- The Summer 2027 trading cycle is late: SIG, Optiver, HRT and Virtu trader internships had already closed, and most offers were signed by mid-October. Apply to the live ones quickly.
- **Early-career programs** (Citadel Securities Spark / Discover, SIG Discovery, Jane Street Bridge / FTTP, Akuna Sneak Peek) are the realistic way in with little experience. They often fast-track to the next year's internship.
- Aggregator lists and firm boards sometimes disagree. Trust the firm's own posting.

## Ideas for later
- **Closed-posting alerts**: flag tracked jobs whose posting has disappeared from the firm's feed.
- **Sync between devices**: currently backup/restore by file; could move to Supabase or Firebase if she wants phone + laptop.
- **Deadline reminders**: browser notifications, or an email digest if a backend is added.
- **Scheduled scrape**: a weekly GitHub Action that runs `npm run scrape` and redeploys, plus a "new since last week" badge.
- **Contacts / referrals**: people met at info sessions, and when to follow up.
- **Interview question bank**: questions she was asked at each firm, to review before the next round.
