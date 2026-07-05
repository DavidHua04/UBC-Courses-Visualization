# 02-knowledge — distill the crawl into a compact knowledge base

Goal: turn thousands of raw pages into a small, versioned set of **knowledge
cards** — self-contained factual statements of advising rules — using a cheap
model for triage and a stronger model for extraction. This is the "use a
cheap model to identify important rules and compress them" stage, with a
concrete downstream contract: cards feed scenario generation in `03-dataset`
and can be injected into prompts at runtime (RAG-lite).

## Why cards instead of compressed documents

Training a small model on compressed documents (continued pretraining) bakes
facts into weights that go stale each academic year and that small models
recall unreliably. Cards keep facts **outside** the weights: they generate
training *scenarios* (so the model learns to reason about such rules when
present in context) and they can be retrieved into the prompt at runtime.
Re-crawl + re-extract = updated advisor, no retraining.

## Pipeline

1. **Chunk** — split extracted text on headings, ~500–1500 tokens per chunk,
   carrying breadcrumb (page title → section path) as metadata.
2. **Triage (cheap model, e.g. Haiku / local 7B)** — classify each chunk:
   `rule | requirement | process | context | noise`, plus a 0–3 advising
   relevance score. Batch, cache by content hash so re-crawls only pay for
   changed chunks. Expect to discard >80% here.
3. **Extract (stronger model, only on surviving chunks)** — rewrite each
   relevant chunk into 1–N knowledge cards:

   ```yaml
   id: sci-promotion-year2
   topic: promotion            # promotion|credit-limit|standing|program-admission|policy|sequence|...
   applies_to: [science]       # faculty/program slugs, or [all]
   statement: >
     Science students need 27 credits including ~ to be promoted to
     second year ...
   source_url: https://...
   source_quote: "verbatim sentence(s) the statement came from"
   effective_year: 2026
   confidence: high            # extractor's own flag; low → human review queue
   ```

   The `source_quote` field is the anti-hallucination anchor: a validation
   script checks the quote actually appears in the source chunk.
4. **Dedupe + merge** — same rule stated on faculty page and calendar page →
   one card, calendar as primary source. Embedding similarity to find
   near-dupes, manual merge for conflicts (conflicts are themselves
   interesting — flag them).
5. **Human pass** — review low-confidence cards and all cards in high-stakes
   topics (promotion, graduation requirements). Target end state: a few
   hundred cards, small enough that skimming all of them is feasible.

## Deliverables / tasks

- [ ] `chunk.ts`, `triage.ts`, `extract.ts` — pipeline scripts with per-step
      content-hash caching under `work/` (gitignored).
- [ ] `cards/` — the reviewed knowledge base, **committed** (it's small,
      curated, and diffable), one YAML file per topic area.
- [ ] `validate.ts` — every card: schema-valid, `source_quote` found in
      source, `source_url` in the crawl manifest, no duplicate ids.
- [ ] Cost estimate before running triage at scale (chunks × price); pick
      the cheap model accordingly.
- [ ] Decide the runtime story: a `policy card` section appended to
      `serializeContext()` output when the user's question matches card
      topics (simple keyword/embedding match — no vector DB needed at a few
      hundred cards). This is an app change; spec it here, build it later.

## Open questions

- Whether course-level facts (from `data/source/courses`) need cards at all
  — probably not; the engine already carries prereqs/credits. Cards should
  hold what the engine *doesn't* know: policies, standing, admission rules
  (exactly the `prereq_unknown` prose territory).
- Versioning cadence: re-run on each academic-year calendar publication.
