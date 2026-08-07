import type { ControlSchema, ControlValue } from "@/registry/schema";

/**
 * Playground values <-> query string. A shared URL is untrusted input, so
 * decoding validates every key against the schema and silently drops
 * anything that doesn't fit rather than throwing.
 *
 * `files` controls are never encoded: uploads live behind object URLs that
 * are meaningless outside the tab that created them.
 */

const NUMBER_PRECISION = 1e6;

function roundNumber(n: number): number {
  // Matches codegen's rounding so URLs don't carry float noise.
  return Math.round(n * NUMBER_PRECISION) / NUMBER_PRECISION;
}

function isDefault(value: ControlValue, def: ControlSchema[string]): boolean {
  if (typeof value === "number" && typeof def.default === "number") {
    return roundNumber(value) === roundNumber(def.default);
  }
  return value === def.default;
}

/** Serializes the non-default, shareable values into a query string. */
export function encodeValues(
  schema: ControlSchema,
  values: Record<string, ControlValue>,
): string {
  const params = new URLSearchParams();
  for (const [key, def] of Object.entries(schema)) {
    if (def.type === "files") continue;
    const value = values[key];
    if (value === undefined || isDefault(value, def)) continue;

    if (typeof value === "number") {
      params.set(key, String(roundNumber(value)));
    } else if (typeof value === "boolean") {
      params.set(key, value ? "true" : "false");
    } else {
      params.set(key, value);
    }
  }
  return params.toString();
}

/** Reads the values a query string carries, ignoring anything invalid. */
export function decodeValues(
  schema: ControlSchema,
  search: string,
): Record<string, ControlValue> {
  const params = new URLSearchParams(search);
  const out: Record<string, ControlValue> = {};

  for (const [key, def] of Object.entries(schema)) {
    if (def.type === "files") continue;
    const raw = params.get(key);
    if (raw === null) continue;

    switch (def.type) {
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < def.min || n > def.max) continue;
        out[key] = roundNumber(n);
        break;
      }
      case "boolean": {
        if (raw !== "true" && raw !== "false") continue;
        out[key] = raw === "true";
        break;
      }
      case "select": {
        if (!def.options.includes(raw)) continue;
        out[key] = raw;
        break;
      }
      default:
        out[key] = raw;
    }
  }
  return out;
}
