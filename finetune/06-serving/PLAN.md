# 06-serving — ship the model behind the existing provider

Goal: the fine-tuned model reachable as an OpenAI-compatible
`/v1/chat/completions` endpoint, so the app needs **zero code changes** —
users (or just David) point `degree-map-ai` settings
(`src/state/aiSettings.ts` → `openaiCompat` provider) at the URL.

## Serving stack

- **Engine**: vLLM (GPU box) or llama.cpp / Ollama (CPU or small GPU, GGUF).
  Both speak OpenAI-compat. Start with llama.cpp + a Q5/Q6 GGUF quant of the
  merged model — an 8B quantized serves fine on modest hardware and keeps
  hosting cost near zero; move to vLLM only if concurrency demands it.
- **Quantize then re-eval**: run `05-eval` against the exact quantized
  artifact; pick the smallest quant whose scores hold within ~1 point of
  fp16. Never ship an un-evaled quant.
- **Decoding defaults**: low temperature (~0.3), modest max_tokens (~600 —
  replies are short by design), stop after the closing fence if the stack
  supports stop sequences. Document the recommended settings; the app sends
  plain chat requests and relies on server defaults.

## Deployment shape (decide when closer)

- **Phase 1 — personal**: model runs on David's machine / a cheap GPU
  rental; app users without an endpoint keep the mock provider. Zero
  public-serving concerns.
- **Phase 2 — hosted (optional)**: a small public endpoint would need
  rate limiting, an app-token check, and abuse consideration (it's a raw
  chat endpoint — someone will try to use it as free general-purpose LLM).
  A thin proxy that only accepts the advisor's request shape (system prompt
  begins with "STUDENT GOAL:", bounded sizes) is cheap insurance. Note this
  reintroduces a server to a deliberately client-only app — keep it an
  optional sidecar, never a dependency; mock remains the default.

## Lifecycle

- Version models as `advisor-vN` with: base model, dataset hash, training
  config, eval scorecard link. Keep the previous version deployable for
  instant rollback.
- Annual refresh path (new calendar year): re-crawl (`01`), re-extract
  cards (`02`) — usually **no retraining needed** since facts live in
  context; retrain only if eval on regenerated scenarios degrades.

## Deliverables / tasks

- [ ] Export script: merge LoRA → safetensors → GGUF quants (Q4/Q5/Q6).
- [ ] Quant-vs-quality table from `05-eval` runs; pick the shipping quant.
- [ ] `serve.md` — exact commands to run the endpoint locally (llama.cpp
      and vLLM variants) + recommended decoding settings.
- [ ] End-to-end check with the real app via `degree-map-ai` settings
      (the `05-eval` smoke test doubles as this).
- [ ] Phase-2 proxy spec (only if/when hosting for others).
