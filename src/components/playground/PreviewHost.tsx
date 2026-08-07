"use client";

import dynamic from "next/dynamic";
import type { ComponentEntry, ControlValue } from "@/registry/schema";

// WebGL host is client-only; loading it lazily also keeps the three.js
// chunk out of pages that never mount an r3f component.
const R3fHost = dynamic(() => import("./R3fHost"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      WebGL を読み込み中…
    </div>
  ),
});

type PreviewHostProps = {
  entry: ComponentEntry;
  values: Record<string, ControlValue>;
};

/**
 * Renders a registry component with live values, switching between the
 * plain DOM host and the react-three-fiber canvas host.
 */
export function PreviewHost({ entry, values }: PreviewHostProps) {
  const Component = entry.component;
  const props = { ...entry.demoProps, ...values };

  if (entry.host === "r3f") {
    return (
      <R3fHost>
        <Component {...props} />
      </R3fHost>
    );
  }

  return <Component {...props} />;
}
