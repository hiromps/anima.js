import type { ComponentEntry } from "./schema";
import { insidePovCarouselEntry } from "./entries/inside-pov-carousel.entry";
import { coverflowCarouselEntry } from "./entries/coverflow-carousel.entry";
import { ringCarouselEntry } from "./entries/ring-carousel.entry";
import { snapCarouselEntry } from "./entries/snap-carousel.entry";
import { parallaxSliderEntry } from "./entries/parallax-slider.entry";
import { expandingPanelsEntry } from "./entries/expanding-panels.entry";
import { thumbnailCarouselEntry } from "./entries/thumbnail-carousel.entry";
import { wheelCarouselEntry } from "./entries/wheel-carousel.entry";
import { fanCarouselEntry } from "./entries/fan-carousel.entry";
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
import { bentoGridEntry } from "./entries/bento-grid.entry";
import { textRevealEntry } from "./entries/text-reveal.entry";
import { shinyTextEntry } from "./entries/shiny-text.entry";
import { numberTickerEntry } from "./entries/number-ticker.entry";
import { dotGridBackgroundEntry } from "./entries/dot-grid-background.entry";
import { orbitingIconsEntry } from "./entries/orbiting-icons.entry";
import { hoverNavEntry } from "./entries/hover-nav.entry";
import { swipeCardStackEntry } from "./entries/swipe-card-stack.entry";
import { spinningBoxEntry } from "./entries/spinning-box.entry";

/**
 * The component registry. Adding a component:
 *  1. Create the component under src/registry/components/<slug>/
 *  2. Create an entry file under src/registry/entries/
 *  3. Add it to this array.
 */
export const registry: ComponentEntry[] = [
  insidePovCarouselEntry as unknown as ComponentEntry,
  coverflowCarouselEntry as unknown as ComponentEntry,
  ringCarouselEntry as unknown as ComponentEntry,
  snapCarouselEntry as unknown as ComponentEntry,
  parallaxSliderEntry as unknown as ComponentEntry,
  expandingPanelsEntry as unknown as ComponentEntry,
  thumbnailCarouselEntry as unknown as ComponentEntry,
  wheelCarouselEntry as unknown as ComponentEntry,
  fanCarouselEntry as unknown as ComponentEntry,
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
  bentoGridEntry as unknown as ComponentEntry,
  textRevealEntry as unknown as ComponentEntry,
  shinyTextEntry as unknown as ComponentEntry,
  numberTickerEntry as unknown as ComponentEntry,
  dotGridBackgroundEntry as unknown as ComponentEntry,
  orbitingIconsEntry as unknown as ComponentEntry,
  hoverNavEntry as unknown as ComponentEntry,
  swipeCardStackEntry as unknown as ComponentEntry,
  spinningBoxEntry as unknown as ComponentEntry,
];

export function getEntry(slug: string): ComponentEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
