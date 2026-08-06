import type { ComponentType } from "react";

/**
 * Control schema — the single source of truth per component.
 * The playground auto-renders controls from it, and the code
 * generator diffs live values against its defaults.
 */

type BaseControl = {
  label: string;
  /** Controls sharing a group render under one section header. */
  group?: string;
  description?: string;
};

export type NumberControl = BaseControl & {
  type: "number";
  default: number;
  min: number;
  max: number;
  step?: number;
  /** Display-only unit suffix, e.g. "px" | "deg". */
  unit?: string;
};

export type BooleanControl = BaseControl & {
  type: "boolean";
  default: boolean;
};

export type ColorControl = BaseControl & {
  type: "color";
  default: string;
};

export type SelectControl<T extends string = string> = BaseControl & {
  type: "select";
  options: readonly T[];
  default: T;
};

export type StringControl = BaseControl & {
  type: "string";
  default: string;
};

export type FilesControl = BaseControl & {
  type: "files";
  /** input accept attribute, e.g. "image/*,video/*". */
  accept: string;
  /** JSON-encoded UploadedMedia[] (see lib/uploads); "" when empty. */
  default: string;
};

export type ControlDef =
  | NumberControl
  | BooleanControl
  | ColorControl
  | SelectControl
  | StringControl
  | FilesControl;

export type ControlSchema = Record<string, ControlDef>;

export type ControlValue = number | boolean | string;

/** Derives the prop value types from a schema. */
export type PropValues<S extends ControlSchema> = {
  [K in keyof S]: S[K] extends NumberControl
    ? number
    : S[K] extends BooleanControl
      ? boolean
      : S[K] extends SelectControl<infer T>
        ? T
        : string;
};

export function schemaDefaults<S extends ControlSchema>(
  schema: S,
): PropValues<S> {
  const out: Record<string, ControlValue> = {};
  for (const [key, def] of Object.entries(schema)) {
    out[key] = def.default;
  }
  return out as PropValues<S>;
}

/** Ordered list of group names as they first appear in the schema. */
export function schemaGroups(schema: ControlSchema): string[] {
  const groups: string[] = [];
  for (const def of Object.values(schema)) {
    const group = def.group ?? "General";
    if (!groups.includes(group)) groups.push(group);
  }
  return groups;
}

export type ComponentCategory =
  | "carousel"
  | "3d-scene"
  | "text"
  | "background";

export type TechTag = "css-3d" | "r3f" | "framer-motion";

export type CodegenConfig = {
  /** JSX tag name, e.g. "InsidePovCarousel". */
  componentName: string;
  /**
   * Consumer-facing import path, i.e. the path the generated snippet
   * imports from in the target project (e.g. "@/components/inside-pov-carousel").
   */
  importPath: string;
  /** npm packages the installed component needs at runtime → shadcn `dependencies`. */
  dependencies?: string[];
  /** npm packages needed to type-check/build the component → shadcn `devDependencies`. */
  devDependencies?: string[];
  /** Data props the consumer must supply; emitted as commented stubs. */
  requiredDataProps?: { name: string; placeholder: string }[];
  /** Playground-only knobs never emitted as JSX props. */
  skipProps?: string[];
  /**
   * Extra fully-formatted JSX props derived from live values
   * (e.g. an items array built from uploaded media). May be multiline.
   */
  extraProps?: (values: Record<string, ControlValue>) => string[];
  /** Extra TODO comment lines derived from live values. */
  extraTodos?: (values: Record<string, ControlValue>) => string[];
};

export type ComponentEntry<S extends ControlSchema = ControlSchema> = {
  slug: string;
  name: string;
  description: string;
  category: ComponentCategory;
  tech: TechTag[];
  /** "dom" renders directly; "r3f" renders inside a <Canvas>. */
  host: "dom" | "r3f";
  schema: S;
  component: ComponentType<Partial<PropValues<S>> & Record<string, unknown>>;
  /** Preview-only data merged under the live values (e.g. demo media). */
  demoProps?: Record<string, unknown>;
  codegen: CodegenConfig;
  preview?: {
    /** Scale applied to the gallery card preview. */
    scale?: number;
    background?: string;
  };
};

/** Identity helper that preserves the concrete schema type. */
export function defineEntry<S extends ControlSchema>(
  entry: ComponentEntry<S>,
): ComponentEntry<S> {
  return entry;
}
