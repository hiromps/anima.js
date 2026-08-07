"use client";

import { Input } from "@/components/ui/input";
import type { StringControl as StringControlDef } from "@/registry/schema";

type Props = {
  def: StringControlDef;
  value: string;
  onChange: (value: string) => void;
};

export function StringControl({ value, onChange }: Props) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs"
    />
  );
}
