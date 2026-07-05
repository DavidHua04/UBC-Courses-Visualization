# 01-corpus — crawl UBC sources into a raw document archive

Goal: a reproducible, incremental archive of the UBC pages/documents that
contain advising-relevant knowledge. This stage only **acquires and stores**;
no judgment about importance happens here (that's `02-knowledge`), so the
crawler stays dumb, cheap, and re-runnable.

## Sources, in priority order

1. **UBC Academic Calendar** (vancouver.calendar.ubc.ca) — the authoritative
   source: degree requirements, promotion/standing rules, credit limits,
   grading policies, faculty-specific regulations. Highest value per page.
2. **Faculty/department advising pages** (e.g. science.ubc.ca advising,
   cs.ubc.ca undergrad pages) — practical rules the calendar states dryly:
   specialization admission averages, coop rules, common course sequences.
3. **Program/specialization requirement pages** — cross-check against
   `data/source/programs.json` and a future source for programs beyond
   cs-major.
4. **Registration/policy pages** (students.ubc.ca) — add/drop deadlines,
   standing requirements, transfer credit policy.
5. *(Skip for now)* Reddit/RMP/social content — noisy, unverifiable, and a
   liability in an advisor's training data.

Maintain the actual URL seed list in `seeds.txt` (one URL + scope prefix per
line) so re-crawls are declarative.

## Crawler design

- Plain TypeScript (`tsx`) script, consistent with `scripts/` — fetch +
  a lightweight HTML-to-text/markdown step. No headless browser unless a
  target turns out to be JS-rendered (check first; the calendar is largely
  server-rendered).
- **Politeness**: respect robots.txt, 1 req/sec/host, identifying
  User-Agent with contact email. UBC sites are small; a full crawl can take
  hours — that's fine.
- **Scope control**: only follow links matching the seed's scope prefix and
  depth limit; hard blocklist for calendars-of-events, search pages, login.
- **Incremental**: store `state/crawl-log.jsonl` (url, fetch time, content
  hash, HTTP status). Re-runs skip unchanged pages (ETag/Last-Modified or
  hash compare) so refreshing before a new academic year is cheap.
- **Storage**: `raw/<host>/<path-hash>.json` with `{url, fetchedAt, title,
  html?, text, links}`. Keep extracted text always; keep raw HTML only when
  extraction looks lossy (tables). Gitignored.

## Deliverables / tasks

- [ ] `seeds.txt` — curated seed URLs with scope prefixes and depth limits.
- [ ] `crawl.ts` — polite incremental crawler as described.
- [ ] `extract.ts` — HTML → clean markdown-ish text; must preserve tables
      (calendar requirement tables are the payload) and headings (used as
      chunk boundaries in `02-knowledge`).
- [ ] A `snapshot.json` manifest per crawl run: date, page count, per-host
      counts — so knowledge-base versions can say which crawl they came from.
- [ ] Verify coverage manually: spot-check ~20 pages a real advisor would
      cite (promotion rules, credit-exclusion lists, CS specialization
      admission) and confirm they're in the archive with usable text.

## Open questions

- Whether the Calendar offers a structured export or sitemap that beats
  link-following — check before writing the crawler.
- PDF handling (some faculty rules ship as PDFs): start by logging PDFs
  encountered, decide later whether the few that matter justify a parser.
