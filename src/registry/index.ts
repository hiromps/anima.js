import type { ComponentEntry } from "./schema";
import { insidePovCarouselEntry } from "./entries/inside-pov-carousel.entry";
import { glassBottomTabBarEntry } from "./entries/glass-bottom-tab-bar.entry";
import { glassBottomSheetEntry } from "./entries/glass-bottom-sheet.entry";
import { glassToastEntry } from "./entries/glass-toast.entry";
import { glassSegmentedControlEntry } from "./entries/glass-segmented-control.entry";
import { glassSwitchEntry } from "./entries/glass-switch.entry";
import { glassSliderEntry } from "./entries/glass-slider.entry";
import { glassFabMenuEntry } from "./entries/glass-fab-menu.entry";
import { glassTopBarEntry } from "./entries/glass-top-bar.entry";
import { auroraBackgroundEntry } from "./entries/aurora-background.entry";
import { textScrambleEntry } from "./entries/text-scramble.entry";
import { spotlightCardEntry } from "./entries/spotlight-card.entry";
import { tiltCardEntry } from "./entries/tilt-card.entry";
import { magneticButtonEntry } from "./entries/magnetic-button.entry";
import { borderBeamEntry } from "./entries/border-beam.entry";
import { magnifyDockEntry } from "./entries/magnify-dock.entry";
import { infiniteMarqueeEntry } from "./entries/infinite-marquee.entry";
import { spinningBoxEntry } from "./entries/spinning-box.entry";

/**
 * The component registry. Adding a component:
 *  1. Create the component under src/registry/components/<slug>/
 *  2. Create an entry file under src/registry/entries/
 *  3. Add it to this array.
 */
export const registry: ComponentEntry[] = [
  insidePovCarouselEntry as unknown as ComponentEntry,
  glassBottomTabBarEntry as unknown as ComponentEntry,
  glassBottomSheetEntry as unknown as ComponentEntry,
  glassToastEntry as unknown as ComponentEntry,
  glassSegmentedControlEntry as unknown as ComponentEntry,
  glassSwitchEntry as unknown as ComponentEntry,
  glassSliderEntry as unknown as ComponentEntry,
  glassFabMenuEntry as unknown as ComponentEntry,
  glassTopBarEntry as unknown as ComponentEntry,
  auroraBackgroundEntry as unknown as ComponentEntry,
  textScrambleEntry as unknown as ComponentEntry,
  spotlightCardEntry as unknown as ComponentEntry,
  tiltCardEntry as unknown as ComponentEntry,
  magneticButtonEntry as unknown as ComponentEntry,
  borderBeamEntry as unknown as ComponentEntry,
  magnifyDockEntry as unknown as ComponentEntry,
  infiniteMarqueeEntry as unknown as ComponentEntry,
  spinningBoxEntry as unknown as ComponentEntry,
];

export function getEntry(slug: string): ComponentEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
