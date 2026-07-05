// BYOK Anthropic Messages API, called directly from the browser (the API
// allows this when the caller opts in via the browser-access header). The
// key lives only in this browser's localStorage — never in plan data.

import type { AdvisorProvider, ProviderSettings } from "../types";

const DEFAULT_MODEL = "claude-opus-4-8";

export function createAnthropicProvider(settings: ProviderSettings): AdvisorProvider {
  return {
    kind: "anthropic",
    async send(req, opts) {
      const apiKey = settings.apiKey.trim();
      if (!apiKey) {
        throw new Error("Paste your Anthropic API key in the Advisor settings (gear icon).");
      }

      let res: Response;
      try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: opts?.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: settings.model.trim() || DEFAULT_MODEL,
            max_tokens: 1024,
            system: req.system,
            messages: req.messages,
          }),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        throw new Error("Could not reach api.anthropic.com — check your connection.");
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Anthropic API returned ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
        stop_reason?: string;
      };
      if (data.stop_reason === "refusal") {
        throw new Error("The model declined to answer this request.");
      }
      const text = data.content?.find((b) => b.type === "text")?.text;
      if (typeof text !== "string") {
        throw new Error("Unexpected response shape from the Anthropic API.");
      }
      return { text };
    },
  };
}
