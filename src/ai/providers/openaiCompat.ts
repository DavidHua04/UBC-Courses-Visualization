// Generic OpenAI-compatible chat-completions client. This is the connector
// for a self-hosted model (Ollama, vLLM, llama.cpp server, ...) — pointing
// the settings at the server is the only integration step.

import type { AdvisorProvider, ProviderSettings } from "../types";

/** "http://host:11434/" → "http://host:11434/v1" (idempotent). */
export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function createOpenAICompatProvider(settings: ProviderSettings): AdvisorProvider {
  return {
    kind: "openai-compat",
    async send(req, opts) {
      const baseUrl = settings.baseUrl.trim();
      const model = settings.model.trim();
      if (!baseUrl || !model) {
        throw new Error("Set the server URL and model name in the Advisor settings (gear icon).");
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`;

      let res: Response;
      try {
        res = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
          method: "POST",
          headers,
          signal: opts?.signal,
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: req.system }, ...req.messages],
            temperature: 0.2,
            max_tokens: 1024,
          }),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        // A fetch TypeError is indistinguishable from a CORS block — name both.
        throw new Error(
          `Could not reach ${baseUrl}. Either the server is down, or it isn't sending CORS ` +
            "headers for this origin (Ollama: set OLLAMA_ORIGINS; vLLM/llama.cpp: enable " +
            "CORS or put a reverse proxy in front).",
        );
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error("Unexpected response shape — is this an OpenAI-compatible endpoint?");
      }
      return { text };
    },
  };
}
