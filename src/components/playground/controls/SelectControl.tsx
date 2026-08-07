"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectControl as SelectControlDef } from "@/registry/schema";

type Props = {
  def: SelectControlDef;
  value: string;
  onChange: (value: string) => void;
};

export function SelectControl({ def, value, onChange }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (typeof v === "string") onChange(v);
      }}
    >
      <SelectTrigger className="h-8 w-full text-xs pointer-coarse:h-11">
        {/* Base UI renders the raw value by default; map it to the label. */}
        <SelectValue>
          {(selected: string) => def.optionLabels?.[selected] ?? selected}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {def.options.map((option) => (
          <SelectItem key={option} value={option} className="text-xs">
            {def.optionLabels?.[option] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
