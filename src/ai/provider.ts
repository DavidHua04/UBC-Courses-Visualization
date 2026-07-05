// Provider registry. The advisor works out of the box with the built-in
// heuristics; remote providers are opt-in via settings.

import type { AdvisorProvider, ProviderSettings } from "./types";
import { createMockProvider } from "./providers/mock";
import { createOpenAICompatProvider } from "./providers/openaiCompat";
import { createAnthropicProvider } from "./providers/anthropic";

export function createProvider(settings: ProviderSettings): AdvisorProvider {
  switch (settings.provider) {
    case "openai-compat":
      return createOpenAICompatProvider(settings);
    case "anthropic":
      return createAnthropicProvider(settings);
    default:
      return createMockProvider();
  }
}
