import { describe, expect, it } from "vitest";
import { generateJsx } from "@/lib/codegen";
import type { ComponentEntry, ControlValue } from "@/registry/schema";

/**
 * Builds a throwaway entry. Only the fields codegen reads are populated —
 * the component itself is never rendered here.
 */
function makeEntry(
  schema: Record<string, unknown>,
  codegen: Record<string, unknown> = {},
): ComponentEntry {
  return {
    slug: "demo",
    name: "Demo",
    description: "",
    category: "carousel",
    tech: ["css-3d"],
    host: "dom",
    schema,
    component: () => null,
    codegen: {
      componentName: "Demo",
      importPath: "@/components/demo",
      ...codegen,
    },
  } as unknown as ComponentEntry;
}

const ALL_TYPES = {
  label: { type: "string", label: "Label", default: "hello" },
  color: { type: "color", label: "Color", default: "#8b5cf6" },
  mode: {
    type: "select",
    label: "Mode",
    options: ["a", "b"],
    default: "a",
  },
  count: { type: "number", label: "Count", default: 14, min: 0, max: 20 },
  enabled: { type: "boolean", label: "Enabled", default: true },
};

describe("generateJsx", () => {
  it("emits every prop even when the value equals the schema default", () => {
    const code = generateJsx(makeEntry(ALL_TYPES), {}, { includeImport: false });

    expect(code).toContain('label="hello"');
    expect(code).toContain('color="#8b5cf6"');
    expect(code).toContain('mode="a"');
    expect(code).toContain("count={14}");
    expect(code).toContain("enabled={true}");
  });

  it("spells booleans out instead of using JSX shorthand", () => {
    const code = generateJsx(
      makeEntry({
        on: { type: "boolean", label: "On", default: false },
        off: { type: "boolean", label: "Off", default: true },
      }),
      { on: true, off: false },
      { includeImport: false },
    );

    expect(code).toContain("on={true}");
    expect(code).toContain("off={false}");
    // The bare-prop form must not survive anywhere.
    expect(code).not.toMatch(/\s(on|off)\s*\n/);
  });

  it("rounds away float noise from slider steps", () => {
    const code = generateJsx(
      makeEntry({
        speed: { type: "number", label: "Speed", default: 0, min: 0, max: 1 },
      }),
      { speed: 0.1 + 0.2 },
      { includeImport: false },
    );

    expect(code).toContain("speed={0.3}");
    expect(code).not.toContain("0.30000000000000004");
  });

  it("omits playground-only knobs listed in skipProps", () => {
    const code = generateJsx(
      makeEntry(ALL_TYPES, { skipProps: ["mode", "label"] }),
      {},
      { includeImport: false },
    );

    expect(code).not.toContain("mode=");
    expect(code).not.toContain("label=");
    expect(code).toContain("count={14}");
  });

  it("escapes strings that would break out of a JSX attribute", () => {
    const code = generateJsx(
      makeEntry({
        alt: { type: "string", label: "Alt", default: "" },
      }),
      { alt: 'a "quoted" \\ path' },
      { includeImport: false },
    );

    expect(code).toContain('alt={"a \\"quoted\\" \\\\ path"}');
  });

  it("keeps the plain attribute form for ordinary strings", () => {
    const code = generateJsx(
      makeEntry({ alt: { type: "string", label: "Alt", default: "" } }),
      { alt: "plain text" },
      { includeImport: false },
    );

    expect(code).toContain('alt="plain text"');
  });

  it("emits required data props and extra todos as comments", () => {
    const code = generateJsx(
      makeEntry(
        {},
        {
          requiredDataProps: [{ name: "items", placeholder: "your media" }],
          extraTodos: () => ["copy the files"],
        },
      ),
      {},
      { includeImport: false },
    );

    expect(code).toContain("// TODO: items を用意してください — your media");
    expect(code).toContain("// TODO: copy the files");
  });

  it("appends extraProps after the schema-derived props", () => {
    const code = generateJsx(
      makeEntry(
        { count: { type: "number", label: "N", default: 2, min: 0, max: 9 } },
        { extraProps: () => ["items={[\n  { src: \"/a.png\" },\n]}"] },
      ),
      {},
      { includeImport: false },
    );

    expect(code.indexOf("count={2}")).toBeLessThan(code.indexOf("items={["));
    expect(code).toContain('{ src: "/a.png" }');
  });

  it("includes the import line unless opted out", () => {
    const values: Record<string, ControlValue> = {};
    const entry = makeEntry({});

    expect(generateJsx(entry, values)).toContain(
      'import { Demo } from "@/components/demo";',
    );
    expect(generateJsx(entry, values, { includeImport: false })).not.toContain(
      "import {",
    );
  });

  it("renders a self-closing tag when there is nothing to emit", () => {
    expect(generateJsx(makeEntry({}), {}, { includeImport: false })).toBe(
      "<Demo />",
    );
  });
});
