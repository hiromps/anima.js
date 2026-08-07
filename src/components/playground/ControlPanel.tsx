"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { NumberControl } from "./controls/NumberControl";
import { BooleanControl } from "./controls/BooleanControl";
import { ColorControl } from "./controls/ColorControl";
import { SelectControl } from "./controls/SelectControl";
import { StringControl } from "./controls/StringControl";
import { FilesControl } from "./controls/FilesControl";
import {
  DEFAULT_GROUP,
  schemaGroups,
  type ControlDef,
  type ControlValue,
  type ControlSchema,
} from "@/registry/schema";
import { RotateCcw } from "lucide-react";

type ControlPanelProps = {
  schema: ControlSchema;
  values: Record<string, ControlValue>;
  onChange: (key: string, value: ControlValue) => void;
  onReset: () => void;
};

function ControlInput({
  def,
  value,
  onChange,
}: {
  def: ControlDef;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
}) {
  switch (def.type) {
    case "number":
      return (
        <NumberControl def={def} value={value as number} onChange={onChange} />
      );
    case "boolean":
      return (
        <BooleanControl def={def} value={value as boolean} onChange={onChange} />
      );
    case "color":
      return (
        <ColorControl def={def} value={value as string} onChange={onChange} />
      );
    case "select":
      return (
        <SelectControl def={def} value={value as string} onChange={onChange} />
      );
    case "string":
      return (
        <StringControl def={def} value={value as string} onChange={onChange} />
      );
    case "files":
      return (
        <FilesControl def={def} value={value as string} onChange={onChange} />
      );
  }
}

export function ControlPanel({
  schema,
  values,
  onChange,
  onReset,
}: ControlPanelProps) {
  const groups = schemaGroups(schema);
  const anyChanged = Object.entries(schema).some(
    ([key, def]) => values[key] !== undefined && values[key] !== def.default,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium">コントロール</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!anyChanged}
          className="h-7 gap-1.5 text-xs text-muted-foreground pointer-coarse:h-11"
        >
          <RotateCcw className="size-3" />
          リセット
        </Button>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => {
          const controls = Object.entries(schema).filter(
            ([, def]) => (def.group ?? DEFAULT_GROUP) === group,
          );
          return (
            <section key={group} className="border-b border-border/60 px-4 py-3">
              <h3 className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group}
              </h3>
              <div className="space-y-3.5">
                {controls.map(([key, def]) => {
                  const value = values[key] ?? def.default;
                  const changed = value !== def.default;
                  const inline = def.type === "boolean";
                  return (
                    <div
                      key={key}
                      className={
                        inline
                          ? "flex items-center justify-between gap-3"
                          : "space-y-1.5"
                      }
                    >
                      <div className={inline ? "min-w-0" : undefined}>
                        <Label className="flex items-center gap-1.5 text-xs text-foreground/80">
                          {def.label}
                          {changed && (
                            <span
                              className="size-1 rounded-full bg-primary"
                              aria-label="変更あり"
                            />
                          )}
                        </Label>
                        {/* Rendered rather than left in a `title` tooltip —
                            tooltips never surface on touch devices. */}
                        {def.description && (
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {def.description}
                          </p>
                        )}
                      </div>
                      <ControlInput
                        def={def}
                        value={value}
                        onChange={(v) => onChange(key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
