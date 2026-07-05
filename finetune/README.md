# Fine-tuning the Degree Map advisor model

Goal: replace the mock provider with a small self-hosted LLM, served through
the existing OpenAI-compatible provider (`src/ai/providers/openaiCompat.ts`),
that gives grounded UBC degree-planning advice in the exact protocol the app
already speaks (`src/ai/context.ts` prompt in, `src/ai/parse.ts` reply out).

## Strategy in one paragraph

We do **not** try to bake the UBC catalog or policies into model weights —
facts change every academic year and small models memorize poorly. The app
already grounds every request with engine-computed facts (eligibility,
credits, unmet requirements, a ranked candidate pool). Fine-tuning therefore
teaches **behavior**: trust the grounding, reason over it, write concise
advice, and always end with one valid fenced-JSON recommendations block using
only candidate courseIds. UBC documents (crawled + distilled) feed the
pipeline in two ways: as raw material for generating realistic training
scenarios, and as a compact knowledge base whose snippets can be injected
into the prompt at runtime for policy questions.

## Pipeline (each stage = one folder, each has a PLAN.md)

```
01-corpus/     crawl UBC sources → raw document archive
02-knowledge/  cheap-model triage + distillation → compact knowledge base
03-dataset/    scenario simulation + teacher distillation + engine
               verification → SFT (and later preference) datasets
04-training/   base-model choice, LoRA SFT, optional DPO
05-eval/       automatic checks (parse + engine), judge scoring, gates
06-serving/    quantize, serve OpenAI-compatible, wire into the app
```

Stages 03 and 05 lean on the repo's own engine as an oracle: a recommended
course either exists, is eligible in the target term, and fits credit limits
— or it doesn't. Every training example and every eval run is checked
against it mechanically.

## Ground rules

- Heavy artifacts (crawled pages, datasets, checkpoints) are **gitignored**
  (see `.gitignore` here); only code, configs, plans, and small curated
  files are committed.
- Anything that renders prompts or checks recommendations must import the
  real `src/ai/context.ts` / `src/ai/parse.ts` / `src/engine/*` — never a
  reimplementation — so training data can't drift from the app.
- The serving contract stays what `degree-map-ai` settings already support:
  an OpenAI-compatible `/v1/chat/completions` endpoint. No app changes
  should be required to swap mock → fine-tuned model.

## Rough order of work

1. `01-corpus` + `02-knowledge` can start now (data acquisition is slow and
   independent of modeling decisions).
2. `05-eval` scaffolding early — build the eval harness **before** training
   so the mock provider and a raw base model give baseline numbers.
3. `03-dataset` → `04-training` → `05-eval` loop until quality gates pass.
4. `06-serving` last.
