"use client";

import { Input } from "@/components/ui/input";
import type { ColorControl as ColorControlDef } from "@/registry/schema";

type Props = {
  def: ColorControlDef;
  value: string;
  onChange: (value: string) => void;
};

export function ColorControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-input">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 size-12 cursor-pointer border-0 p-0"
          aria-label="色を選択"
        />
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="h-8 flex-1 font-mono text-xs"
      />
    </div>
  );
}
