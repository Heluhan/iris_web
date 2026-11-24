/**
 * Target firms (from her priority list). `feeds` are public job-board APIs the
 * scraper reads; firms without one get a `careers` link to check by hand.
 *
 *   greenhouse → https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
 *   lever      → https://api.lever.co/v0/postings/<slug>?mode=json
 *   ashby      → https://api.ashbyhq.com/posting-api/job-board/<slug>
 *   workday    → { ats: 'workday', host: 'acme.wd5.myworkdayjobs.com', tenant: 'acme', site: 'Careers' }
 *   pinpoint / workable / sig / deshaw / avature → see adapters in scrape.mjs
 *
 * `known` lists openings found by hand on sites that block scraping (shown as "Checked by hand").
 *
 * Feeds verified 2026-11-24.
 */
const gh = (slug) => ({ ats: 'greenhouse', slug });
const lever = (slug) => ({ ats: 'lever', slug });
const ashby = (slug) => ({ ats: 'ashby', slug });
const pinpoint = (slug) => ({ ats: 'pinpoint', slug });
const workable = (slug) => ({ ats: 'workable', slug });
const workday = (host, tenant, site) => ({ ats: 'workday', host, tenant, site });

export const FIRMS = [
  // ---- Priority 1 ----
  { name: 'DV Trading', priority: 1, kind: 'prop', targets: 'Quant Trader, QR, Futures & Options Trading', feeds: [gh('dvtrading')] },
  { name: 'TransMarket Group', priority: 1, kind: 'prop', targets: 'Quant Trader, Algorithmic Trader', feeds: [gh('transmarketgroup')] },
  { name: 'Belvedere Trading', priority: 1, kind: 'prop', targets: 'Quant Trader', feeds: [lever('belvederetrading')] },
  { name: 'Chicago Trading Company', priority: 1, kind: 'prop', targets: 'Quant Trader', feeds: [gh('chicagotradingcampus')] },
  { name: 'Gelber Group', priority: 1, kind: 'prop', targets: 'Discretionary Trader', feeds: [gh('gelbergroup')] },
  { name: 'Voloridge Investment Management', priority: 1, kind: 'fund', targets: 'Quant Trader, QR', feeds: [gh('voloridgeinvestmentmanagement')] },
  { name: 'Stevens Capital Management', priority: 1, kind: 'fund', targets: 'QR', feeds: [gh('scm')] },
  { name: 'Capstone Investment Advisors', priority: 1, kind: 'fund', targets: 'Quant Research', feeds: [gh('capstoneinvestmentadvisors')] },
  { name: 'Soros Fund Management', priority: 1, kind: 'fund', targets: 'Quant Strategist', feeds: [gh('familyoffice')] },
  { name: 'Flow Traders', priority: 1, kind: 'prop', targets: 'Quant Trader', feeds: [gh('flowtraders')] },
  { name: 'Geneva Trading', priority: 1, kind: 'prop', targets: 'Quant Trader', feeds: [gh('genevatrading')] },
  { name: 'DV Commodities', priority: 1, kind: 'prop', targets: 'Commodities Trader', feeds: [], careers: 'https://dvtrading.co/join-dv', note: 'Part of DV Trading; its roles are listed under DV Trading' },
  // ---- Priority 2 ----
  { name: 'Aquatic Capital Management', priority: 2, kind: 'fund', targets: 'QR', feeds: [gh('aquaticcapitalmanagement')] },
  { name: 'Acadian Asset Management', priority: 2, kind: 'fund', targets: 'Quantitative Investment', feeds: [gh('acadianassetmanagementllc')] },
  { name: 'Verition Fund Management', priority: 2, kind: 'fund', targets: 'Investment Research', feeds: [gh('veritiongroupllc')] },
  { name: 'Brevan Howard', priority: 2, kind: 'fund', targets: 'Systematic Execution Research, QR', feeds: [workday('brevanhoward.wd3.myworkdayjobs.com', 'brevanhoward', 'BH_ExternalCareers')] },
  { name: 'PEAK6', priority: 2, kind: 'prop', targets: 'Options Trader', feeds: [workday('peak6group.wd1.myworkdayjobs.com', 'peak6group', 'PEAK6')] },
  // ---- Priority 3: prop ----
  { name: 'Wolverine Trading', priority: 3, kind: 'prop', feeds: [pinpoint('wolve')] },
  { name: 'Old Mission Capital', priority: 3, kind: 'prop', feeds: [ashby('old-mission-capital')] },
  { name: 'Group One Trading', priority: 3, kind: 'prop', feeds: [], careers: 'https://group1.applicantpro.com/jobs/',
    known: [{ title: 'Trading Analyst Intern', location: 'Chicago, IL (onsite, CBOE)', url: 'https://group1.applicantpro.com/jobs/4192883', track: 'trader', note: 'Jun–Aug 2027; must be an active college student in Fall 2027. Open until filled (checked 2026-11-24).' }] },
  { name: 'Akuna Capital', priority: 3, kind: 'prop', feeds: [gh('akunacapital')] },
  { name: 'XR Trading', priority: 3, kind: 'prop', feeds: [], careers: 'https://recruiting.paylocity.com/recruiting/jobs/All/5c109104-7c4d-415c-9ee4-54e3af55f9e7/XR-Trading-LLC', note: 'No trading intern posted on 2026-11-24' },
  { name: 'Headlands Technologies', priority: 3, kind: 'prop', feeds: [gh('headlandstechnologiesllc')] },
  { name: 'Radix Trading', priority: 3, kind: 'prop', feeds: [gh('radixuniversity')] },
  { name: 'Trillium Trading', priority: 3, kind: 'prop', feeds: [gh('trillium')] },
  { name: 'Five Rings', priority: 3, kind: 'prop', feeds: [gh('fiveringsllc')] },
  { name: 'Maven Securities', priority: 3, kind: 'prop', feeds: [], careers: 'https://www.mavensecurities.com', note: 'Job board not identified' },
  { name: 'Allston Trading', priority: 3, kind: 'prop', feeds: [], careers: 'https://www.allstontrading.com', note: 'Site unreachable from the scraper' },
  { name: 'WH Trading', priority: 3, kind: 'prop', feeds: [], careers: 'https://www.whtrading.com/life-at-wh-trading/', note: 'Runs a 9-week summer program but posts no listings; contact them directly' },
  { name: 'Simplex Trading', priority: 3, kind: 'prop', feeds: [gh('simplextrading')] },
  { name: 'Tanius Technology', priority: 3, kind: 'prop', feeds: [gh('tanius')] },
  { name: '3Red Partners', priority: 3, kind: 'prop', feeds: [gh('3redpartners')] },
  { name: 'Consolidated Trading', priority: 3, kind: 'prop', feeds: [], careers: 'https://www.consolidatedtrading.com', note: 'Site unreachable from the scraper' },
  { name: 'Valkyrie Trading', priority: 3, kind: 'prop', feeds: [lever('valkyrietrading')] },
  { name: 'Eagle Seven', priority: 3, kind: 'prop', feeds: [workable('eagle-seven')] },
  { name: 'Tower Research Capital', priority: 3, kind: 'prop', feeds: [gh('towerresearchcapital')] },
  { name: 'GTS', priority: 3, kind: 'prop', feeds: [], careers: 'https://careers-gtsx.icims.com/jobs/search?ss=1', note: 'Its Summer 2027 QT intern (iCIMS #1562) was taken down' },
  // ---- Priority 3: quant funds ----
  { name: 'Squarepoint Capital', priority: 3, kind: 'fund', feeds: [gh('squarepointcapital')] },
  { name: 'WorldQuant', priority: 3, kind: 'fund', feeds: [gh('worldquant')] },
  { name: 'Qube Research & Technologies', priority: 3, kind: 'fund', feeds: [gh('quberesearchandtechnologies')] },
  { name: 'Cubist Systematic Strategies', priority: 3, kind: 'fund', feeds: [gh('point72')], note: 'Posts on the Point72 board; non-quant Point72 roles are filtered out',
    exclude: /fundamental|sector analyst|investment services|academy|investment analyst|canvas/i },
  { name: 'Engineers Gate', priority: 3, kind: 'fund', feeds: [gh('engineersgate')] },
  { name: 'ExodusPoint Capital Management', priority: 3, kind: 'fund', feeds: [gh('exoduspoint')] },
  { name: 'Schonfeld Strategic Advisors', priority: 3, kind: 'fund', feeds: [gh('schonfeld')] },
  { name: 'Graham Capital Management', priority: 3, kind: 'fund', feeds: [gh('grahamcapitalmanagement')] },
  { name: 'Quantbot Technologies', priority: 3, kind: 'fund', feeds: [gh('quantbot-technologies')] },
  { name: 'Trexquant Investment', priority: 3, kind: 'fund', feeds: [workable('trexquant')] },
  { name: 'PanAgora Asset Management', priority: 3, kind: 'fund', feeds: [workday('empower.wd12.myworkdayjobs.com', 'empower', 'PanAgora')] },
  { name: 'Arrowstreet Capital', priority: 3, kind: 'fund', feeds: [workday('arrowstreetcapital.wd5.myworkdayjobs.com', 'arrowstreetcapital', 'Campus_Careers')] },
  { name: 'Campbell & Company', priority: 3, kind: 'fund', feeds: [], careers: 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=27d05e4e-8c09-4ef6-b344-6d123d187916', note: 'ADP job board; no interns on 2026-11-24' },
  { name: 'Walleye Capital', priority: 3, kind: 'fund', feeds: [gh('walleyecapital-external-students')] },
  { name: 'Systematica Investments', priority: 3, kind: 'fund', feeds: [pinpoint('systematica')] },
  { name: 'AQR Capital Management', priority: 3, kind: 'fund', feeds: [gh('aqr')] },
  { name: 'AlphaSimplex Group', priority: 3, kind: 'fund', feeds: [], careers: 'https://virtus.wd5.myworkdayjobs.com/VirtusCareers', note: 'Posts on parent Virtus\'s Workday; nothing for AlphaSimplex on 2026-11-24' },
  { name: 'PDT Partners', priority: 3, kind: 'fund', feeds: [gh('pdtpartners')] },
  { name: 'Voleon Group', priority: 3, kind: 'fund', feeds: [ashby('voleon')] },
  { name: 'AXQ Capital', priority: 3, kind: 'fund', feeds: [gh('axq')] },
  // ---- Priority 4: big names (reach) ----
  { name: 'Jane Street', priority: 4, kind: 'prop', targets: 'QT', feeds: [gh('janestreet')] },
  { name: 'Optiver', priority: 4, kind: 'prop', targets: 'QT, QR', feeds: [gh('optiverus')] },
  { name: 'IMC Trading', priority: 4, kind: 'prop', targets: 'QT, QR', feeds: [gh('imc')] },
  { name: 'SIG', priority: 4, kind: 'prop', targets: 'QT', feeds: [{ ats: 'sig' }] },
  { name: 'DRW', priority: 4, kind: 'prop', targets: 'QT, QR', feeds: [gh('drweng')] },
  { name: 'Hudson River Trading', priority: 4, kind: 'prop', targets: 'Algorithm Developer, QT', feeds: [gh('wehrtyou')] },
  { name: 'Jump Trading', priority: 4, kind: 'prop', targets: 'QT, QR', feeds: [gh('jumptrading')] },
  { name: 'Citadel Securities', priority: 4, kind: 'prop', targets: 'QT, QR', feeds: [], careers: 'https://www.citadelsecurities.com/careers/',
    note: 'Site blocks scrapers; openings below were seen in search results only',
    known: [
      { title: 'Quantitative Trader – Intern (US) (Trading and Research)', location: 'New York / Miami', url: 'https://www.citadelsecurities.com/careers/details/quantitative-trader-intern-us-trading-and-research/', track: 'trader', note: 'Unverified: seen in search results; confirm it is open.' },
      { title: 'Designated Market Maker (DMM) Trader – Intern (US)', location: 'New York', url: 'https://www.citadelsecurities.com/careers/details/designated-market-maker-dmm-trader-intern-us/', track: 'trader', note: 'Unverified: seen in search results; confirm it is open.' },
      { title: 'Credit & Rates Rotational Trader – Intern (US)', location: 'New York', url: 'https://www.citadelsecurities.com/careers/details/credit-rates-rotational-trader-intern-us/', track: 'trader', note: 'Unverified: seen in search results; confirm it is open.' },
    ] },
  { name: 'Citadel', priority: 4, kind: 'fund', targets: 'QR', feeds: [], careers: 'https://www.citadel.com/careers/',
    note: 'Site blocks scrapers',
    known: [{ title: 'Quantitative Trader: Equity Quantitative Research – Intern (US)', location: 'New York / Miami / Greenwich', url: 'https://www.citadel.com/careers/details/quantitative-trader-equity-quantitative-research-intern-us/', track: 'research', note: 'Unverified: seen in search results; confirm it is open and for the 2027 cycle.' }] },
  { name: 'D. E. Shaw', priority: 4, kind: 'fund', targets: 'QT, QR', feeds: [{ ats: 'deshaw' }] },
  { name: 'Two Sigma', priority: 4, kind: 'fund', targets: 'QR', feeds: [{ ats: 'avature', base: 'https://careers.twosigma.com/careers' }] },
];
