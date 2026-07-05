// Advisor provider settings. Deliberately a separate persist store with its
// own localStorage key: API keys and server URLs must never ride along with
// plan data through export, share links, or duplication.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderSettings } from "../ai/types";

interface AiSettingsState extends ProviderSettings {
  update(patch: Partial<ProviderSettings>): void;
}

export const useAiSettings = create<AiSettingsState>()(
  persist(
    (set) => ({
      provider: "mock",
      baseUrl: "",
      apiKey: "",
      model: "",
      update: (patch) => set(patch),
    }),
    {
      name: "degree-map-ai",
      version: 1,
      partialize: ({ provider, baseUrl, apiKey, model }) => ({
        provider,
        baseUrl,
        apiKey,
        model,
      }),
    },
  ),
);
