import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getEntry } from "@/registry";
import type { ControlValue } from "@/registry/schema";

type Values = Record<string, ControlValue>;

type PlaygroundState = {
  /** Live prop values keyed by component slug. */
  values: Record<string, Values>;
  /** Seeds defaults for a slug; no-op if already present so tweaks survive navigation. */
  init: (slug: string, defaults: Values) => void;
  setValue: (slug: string, key: string, value: ControlValue) => void;
  reset: (slug: string, defaults: Values) => void;
};

/**
 * Blanks every `files` control for a slug. Uploads live behind object URLs
 * that die with the tab, so persisting them would restore dead `blob:` src
 * values on the next load.
 */
function withoutUploads(slug: string, values: Values): Values {
  const schema = getEntry(slug)?.schema;
  if (!schema) return values;
  const out: Values = { ...values };
  for (const [key, def] of Object.entries(schema)) {
    if (def.type === "files") out[key] = "";
  }
  return out;
}

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    (set) => ({
      values: {},
      init: (slug, defaults) =>
        set((state) =>
          state.values[slug]
            ? state
            : { values: { ...state.values, [slug]: { ...defaults } } },
        ),
      setValue: (slug, key, value) =>
        set((state) => ({
          values: {
            ...state.values,
            [slug]: { ...state.values[slug], [key]: value },
          },
        })),
      reset: (slug, defaults) =>
        set((state) => ({
          values: { ...state.values, [slug]: { ...defaults } },
        })),
    }),
    {
      name: "anima-playground",
      partialize: (state) => ({
        values: Object.fromEntries(
          Object.entries(state.values).map(([slug, values]) => [
            slug,
            withoutUploads(slug, values),
          ]),
        ),
      }),
      // The playground is prerendered with schema defaults, so reading
      // storage during the first render would trip hydration. PlaygroundClient
      // rehydrates in an effect instead.
      skipHydration: true,
    },
  ),
);
