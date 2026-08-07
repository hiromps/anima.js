/**
 * Single source of truth for the public origin. Used by the install command
 * shown in the playground, the registry URLs, and metadata/OG resolution.
 *
 * Set NEXT_PUBLIC_SITE_URL in the deployment environment; the fallback only
 * exists so local builds and previews resolve to something valid.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anima-js.vercel.app"
).replace(/\/$/, "");

/** Public registry URL for a component, consumable by the shadcn CLI. */
export function registryUrl(slug: string): string {
  return `${siteUrl}/r/${slug}.json`;
}

/** The one-liner a visitor runs to install a component. */
export function installCommand(slug: string): string {
  return `npx shadcn@latest add ${registryUrl(slug)}`;
}
