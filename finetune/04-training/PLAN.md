# 04-training — fine-tune the small model

Goal: a LoRA-fine-tuned small open model that beats the mock provider and a
prompted base model on the `05-eval` suite, small enough to self-host cheaply
behind an OpenAI-compatible endpoint.

## Base model choice

Criteria: ≤8B params (serving cost), strong instruction-following at that
size, permissive license for hosted use, good JSON discipline, long-enough
context (serialized context is ≤6k tokens + history — 16k context is plenty).

Shortlist to evaluate **prompted, before any training** (this is the
baseline; if a prompted 7B already passes eval gates, fine-tuning scope
shrinks to polish):

- Qwen 2.5 / Qwen 3 class 4B–8B instruct — currently the strongest JSON +
  instruction following per parameter; check license terms.
- Llama 3.1 8B Instruct — safe default, huge tooling support.
- A 3–4B option (Qwen 4B / Phi-class) — only if eval shows it's close;
  halves serving cost.

Re-shortlist when this work actually starts — small-model rankings move
fast; pick by *our eval numbers*, not leaderboards.

## Method

1. **SFT with LoRA/QLoRA** on `03-dataset/sft.jsonl`. Full fine-tuning is
   unnecessary at this dataset size and complicates serving.
   - Loss on assistant turns only.
   - Standard starting point: r=16, alpha=32, lr 1e-4 cosine, 2–3 epochs,
     effective batch ≈ 32; tune from eval, not vibes.
   - Train with the exact chat template the serving stack will use —
     template mismatch is the classic silent killer; add a unit test that
     renders one dataset example through the template and asserts the token
     boundary between prompt and completion.
2. **Optional second pass — DPO** on `pref.jsonl` (verified-pass vs. failed
   teacher candidates) if SFT plateaus on format/grounding errors. Only if
   eval says it's needed.
3. **Not doing**: continued pretraining on UBC documents (facts belong in
   context, see `02-knowledge`), RLHF-style pipelines (no reward model
   worth the effort at this scale).

## Infrastructure

- Trainer: Axolotl or Unsloth (single-GPU QLoRA of an 8B fits in 24 GB;
  rentable per-hour on RunPod/Lambda — expect single-digit dollars per run).
  Alternatively a hosted fine-tune (Together/Fireworks) if GPU wrangling
  isn't worth it; both export LoRA adapters.
- Reproducibility: every run gets a config file committed to `configs/`,
  outputs under `runs/<date-name>/` (gitignored) with dataset hash, base
  model, and eval results recorded in a committed `runs.md` log line.

## Deliverables / tasks

- [ ] Baseline pass: run 2–3 prompted base models through `05-eval`; record.
- [ ] `configs/` + first SFT run; compare against baselines.
- [ ] Ablations only as needed: dataset size (does 2k ≈ 5k?), with/without
      hard cases, 4B vs 8B.
- [ ] Chat-template unit test (see above).
- [ ] Merge-or-adapter decision for serving (merged weights simplify
      quantization in `06-serving`).
- [ ] `runs.md` — the committed experiment log.
