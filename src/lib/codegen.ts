import type {
  ComponentEntry,
  ControlDef,
  ControlValue,
} from "@/registry/schema";

function formatNumber(n: number): string {
  // Avoid float noise like 0.30000000000000004 from slider steps.
  return String(Math.round(n * 1e6) / 1e6);
}

function formatProp(name: string, def: ControlDef, value: ControlValue): string {
  switch (def.type) {
    case "boolean":
      // Spelled out rather than using JSX's bare-prop shorthand, so every
      // value is literally visible in the copied snippet.
      return `${name}={${value ? "true" : "false"}}`;
    case "number":
      return `${name}={${formatNumber(value as number)}}`;
    default: {
      // A JSX attribute literal can't carry a quote or backslash, so those
      // values fall back to an expression container.
      const text = String(value);
      return /["\\]/.test(text)
        ? `${name}={${JSON.stringify(text)}}`
        : `${name}="${text}"`;
    }
  }
}

/**
 * Generates copy-ready JSX from the current playground values.
 * Every schema prop is emitted with its live value — including ones
 * still at their default — so the snippet is a self-contained
 * description of the previewed component and survives being pasted
 * into a prompt, where the reader can't know the component's own
 * defaults. Playground-only knobs (`skipProps`) stay out, and
 * required data props are emitted as commented stubs.
 */
export function generateJsx(
  entry: ComponentEntry,
  values: Record<string, ControlValue>,
  options: { includeImport?: boolean } = {},
): string {
  const {
    componentName,
    importPath,
    requiredDataProps,
    skipProps,
    extraProps,
    extraTodos,
  } = entry.codegen;

  const props: string[] = [];
  for (const [key, def] of Object.entries(entry.schema)) {
    if (skipProps?.includes(key)) continue;
    const value = values[key] ?? def.default;
    props.push(formatProp(key, def, value));
  }
  props.push(...(extraProps?.(values) ?? []));

  const multiline = props.length > 2 || props.some((p) => p.includes("\n"));
  const jsx =
    props.length === 0
      ? `<${componentName} />`
      : !multiline
        ? `<${componentName} ${props.join(" ")} />`
        : `<${componentName}\n${props
            .map((p) =>
              p
                .split("\n")
                .map((line) => `  ${line}`)
                .join("\n"),
            )
            .join("\n")}\n/>`;

  // Data props the consumer must wire up are emitted as TODO comments
  // so the copied snippet always compiles as-is.
  const todos = [
    ...(requiredDataProps ?? []).map(
      (p) => `// TODO: ${p.name} を用意してください — ${p.placeholder}`,
    ),
    ...(extraTodos?.(values) ?? []).map((t) => `// TODO: ${t}`),
  ].join("\n");
  const body = todos ? `${todos}\n${jsx}` : jsx;

  if (options.includeImport === false) return body;
  return `import { ${componentName} } from "${importPath}";\n\n${body}`;
}
