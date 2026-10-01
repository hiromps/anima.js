import { registrySources } from "./sources.generated";

/**
 * A file that ships with a component, exactly as the shadcn registry
 * delivers it. `path` is relative to the consumer's components alias root
 * (e.g. `components/<slug>/index.tsx` under `@/`).
 */
export type RegistrySourceFile = {
  path: string;
  content: string;
};

/**
 * The shipped source files of a component, embedded at build time by
 * scripts/generate-registry.ts. The AI prompt pastes these verbatim so an
 * assistant can create the files directly instead of needing the CLI.
 */
export function getRegistrySources(slug: string): RegistrySourceFile[] {
  return registrySources[slug] ?? [];
}
