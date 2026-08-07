"use client";

import { Slider } from "@/components/ui/slider";
import type { NumberControl as NumberControlDef } from "@/registry/schema";

type Props = {
  def: NumberControlDef;
  value: number;
  onChange: (value: number) => void;
};

export function NumberControl({ def, value, onChange }: Props) {
  const decimals = def.step
    ? Math.max(0, -Math.floor(Math.log10(def.step)))
    : 0;
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={value}
        min={def.min}
        max={def.max}
        step={def.step ?? 1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
      />
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {value.toFixed(decimals)}
        {def.unit ? <span className="opacity-60"> {def.unit}</span> : null}
      </span>
    </div>
  );
}
