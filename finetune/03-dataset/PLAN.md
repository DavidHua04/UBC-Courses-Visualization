# 03-dataset — build verified training data by teacher distillation

Goal: thousands of `(prompt, ideal reply)` pairs where the prompt is produced
by the **real** `serializeContext()` over a simulated student plan, and the
reply is written by a strong teacher model, then mechanically verified by the
**real** engine before it may enter the dataset. This is the core stage: the
model we train never sees UBC documents directly — it sees the exact prompt
shape the app emits, paired with replies that demonstrate grounded advising.

## Why this beats training on documents

- The deployed model only ever sees `serializeContext()` output + chat
  history. Training on that exact distribution is what makes a small model
  reliable; document text is out-of-distribution noise for this job.
- Every reply is checkable: recommendations must parse via
  `parseAdvisorReply()`, use only courseIds from the prompt's CANDIDATES
  list, and pass `checkEligibility()` for the target slot. Bad teacher
  outputs get regenerated or dropped — the dataset is verified, not trusted.
- Knowledge cards from `02-knowledge` enter as *scenario ingredients* (a
  prompt that includes a policy snippet + a question about it), teaching the
  model to use policy context when present rather than recall it from weights.

## Scenario simulator

A `tsx` script importing `src/engine/*` and `src/ai/context.ts` directly.
Sample diverse but realistic plans:

- **Programs**: cs-major (has real requirements) heavily; program-less plans
  too (the app supports them and the context says "Program: none selected").
- **Progress stage**: fresh Y1, mid-degree, one-term-left, transfer credits
  (TR row), failed-and-retaking, over/under-loaded terms.
- **Plan health**: clean plans, plans with prereq errors, credit warnings,
  duplicate-course errors — the model must acknowledge PLAN ISSUES.
- **Profile**: varied goals/interests (grad school, co-op, finish early,
  switch specialization, none stated), varied `targetYears`.
- **Context budget**: render some prompts at trimmed budgets (the
  `serializeContext` step ladder) so the model handles compact forms.
- **Conversation**: 60% first-turn, 40% multi-turn via `historyForRequest()`
  (follow-ups like "why not X?", "swap one for something easier").

Coverage matters more than raw count: target ~3–5k final examples with a
scenario-type tag on each, so gaps are measurable.

## Teacher generation + verification loop

1. Render the prompt (system = serialized context incl. FORMAT_INSTRUCTIONS,
   messages = history + user turn).
2. Teacher (Claude Sonnet-class is enough; sample 2–3 candidates) writes the
   reply. Give the teacher a *style contract*: 3–6 sentences of plain prose,
   reference the grounding facts (fills/unlocks/loads) rather than invent,
   then exactly one fenced JSON block, 3–5 recommendations.
3. **Verify** each candidate mechanically:
   - `parseAdvisorReply()` yields 3–5 recommendations, prose non-empty;
   - every courseId ∈ the prompt's CANDIDATES;
   - every course passes `checkEligibility()` at `nextOpenSlot()`;
   - no markdown headings / bullet-only replies (regex);
   - prose mentions at least one grounded fact token (cheap heuristic).
4. Keep the best passing candidate (rank by a short judge rubric if more
   than one passes). Log rejects with reasons — the reject histogram tells
   you where the teacher prompt needs work.
5. Include deliberate **hard cases** with hand-checked target behavior:
   empty candidate list (must say so, no fabricated recs), goal that can't
   be satisfied, user asking for an ineligible course (must decline and
   explain), pure policy question answered from an included knowledge card.

## Formats

- `sft.jsonl` — `{messages: [{role, content}...], meta: {scenario, tags}}`,
  standard chat format for any trainer.
- Later, `pref.jsonl` — `{prompt, chosen, rejected}` pairs harvested from
  the verification loop for free (passing vs. failing candidates for the
  same prompt) → DPO in `04-training`.
- Frozen splits by **scenario seed**, not by example: `train/dev/test` so no
  simulated student leaks across splits. Test set never touches training.

## Deliverables / tasks

- [ ] `simulate.ts` — plan sampler with scenario-type tags + fixed RNG seed.
- [ ] `generate.ts` — teacher calls with caching + resume (runs cost real
      money; must be interruptible).
- [ ] `verify.ts` — the mechanical checks above; also reused by `05-eval`.
- [ ] `stats.ts` — dataset report: scenario coverage, dept distribution,
      reply-length histogram, verification reject reasons.
- [ ] Manually read ~100 random accepted examples before any training run.
      (Non-negotiable; automated checks miss tone and subtle ungroundedness.)
- [ ] Budget: estimate teacher cost at 3 candidates × 5k scenarios before
      running; trim candidate count if needed.
