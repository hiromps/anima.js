import type { ComponentEntry } from "./schema";
import { insidePovCarouselEntry } from "./entries/inside-pov-carousel.entry";
import { spinningBoxEntry } from "./entries/spinning-box.entry";

/**
 * The component registry. Adding a component:
 *  1. Create the component under src/registry/components/<slug>/
 *  2. Create an entry file under src/registry/entries/
 *  3. Add it to this array.
 */
export const registry: ComponentEntry[] = [
  insidePovCarouselEntry as unknown as ComponentEntry,
  spinningBoxEntry as unknown as ComponentEntry,
];

export function getEntry(slug: string): ComponentEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
