"use client";

import { useMemo } from "react";
import {
  ExpandingPanels,
  type ExpandingPanelsProps,
} from "../components/expanding-panels";
import { demoItems } from "./expanding-panels.demo-data";

export type ExpandingPanelsPreviewProps = Pick<
  ExpandingPanelsProps,
  "trigger" | "autoplay" | "interval" | "collapsedSize" | "gap" | "radius" | "orientation"
> & {
  /** Demo-only: how many destinations to show (3–6). */
  itemCount?: number;
};

/**
 * Playground glue: maps the demo-only `itemCount` knob onto the shared
 * destination list and centres the panels on the dark stage.
 *
 * Lives in its own "use client" module: the entry is also evaluated by
 * server code (generateStaticParams, sitemap), which may not import hooks.
 */
export function ExpandingPanelsPreview({ itemCount = 5, ...rest }: ExpandingPanelsPreviewProps) {
  const items = useMemo(() => demoItems(itemCount), [itemCount]);
  // min-h keeps the playground stage (height: auto) tall enough; in the
  // gallery card the box is 448px at scale 0.5, so 440 never crops.
  return (
    <div className="flex h-full min-h-[440px] w-full items-center justify-center px-5 py-5">
      <div className="w-full max-w-[960px]">
        <ExpandingPanels {...rest} items={items} aria-label="旅先ギャラリー" />
      </div>
    </div>
  );
}
