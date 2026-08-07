"use client";

import { Switch } from "@/components/ui/switch";
import type { BooleanControl as BooleanControlDef } from "@/registry/schema";

type Props = {
  def: BooleanControlDef;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function BooleanControl({ value, onChange }: Props) {
  return (
    <Switch checked={value} onCheckedChange={(checked) => onChange(checked)} />
  );
}
