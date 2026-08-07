import { describe, expect, it } from "vitest";
import { decodeValues, encodeValues } from "@/lib/url-state";
import type { ControlSchema } from "@/registry/schema";

const schema = {
  uploads: {
    type: "files",
    label: "Up",
    accept: "image/*",
    default: "",
  },
  mode: {
    type: "select",
    label: "Mode",
    options: ["placeholder", "demo-videos"],
    default: "placeholder",
  },
  count: { type: "number", label: "Count", default: 14, min: 4, max: 20 },
  speed: { type: "number", label: "Speed", default: 0.04, min: 0, max: 0.3 },
  autoRotate: { type: "boolean", label: "Auto", default: true },
  title: { type: "string", label: "Title", default: "" },
} as unknown as ControlSchema;

describe("encodeValues", () => {
  it("emits only values that differ from the schema default", () => {
    const query = encodeValues(schema, {
      mode: "placeholder", // default
      count: 8, // changed
      speed: 0.04, // default
      autoRotate: false, // changed
    });

    expect(new URLSearchParams(query).get("count")).toBe("8");
    expect(new URLSearchParams(query).get("autoRotate")).toBe("false");
    expect(new URLSearchParams(query).has("mode")).toBe(false);
    expect(new URLSearchParams(query).has("speed")).toBe(false);
  });

  it("never encodes uploads — object URLs are meaningless elsewhere", () => {
    const query = encodeValues(schema, {
      uploads: '[{"src":"blob:x","name":"a.png","kind":"image"}]',
    });

    expect(query).toBe("");
  });

  it("rounds away float noise", () => {
    const query = encodeValues(schema, { speed: 0.1 + 0.2 });

    expect(new URLSearchParams(query).get("speed")).toBe("0.3");
  });

  it("produces an empty string when everything is at its default", () => {
    expect(encodeValues(schema, { count: 14, autoRotate: true })).toBe("");
  });
});

describe("decodeValues", () => {
  it("reads valid values back with their proper types", () => {
    const values = decodeValues(
      schema,
      "?count=8&speed=0.12&autoRotate=false&mode=demo-videos&title=hi",
    );

    expect(values).toEqual({
      count: 8,
      speed: 0.12,
      autoRotate: false,
      mode: "demo-videos",
      title: "hi",
    });
  });

  it("drops numbers outside the schema range", () => {
    expect(decodeValues(schema, "?count=999")).toEqual({});
    expect(decodeValues(schema, "?count=1")).toEqual({});
    expect(decodeValues(schema, "?count=notanumber")).toEqual({});
  });

  it("drops select values that are not in options", () => {
    expect(decodeValues(schema, "?mode=bogus")).toEqual({});
  });

  it("only accepts true/false for booleans", () => {
    expect(decodeValues(schema, "?autoRotate=1")).toEqual({});
    expect(decodeValues(schema, "?autoRotate=yes")).toEqual({});
    expect(decodeValues(schema, "?autoRotate=true")).toEqual({
      autoRotate: true,
    });
  });

  it("ignores keys that are not in the schema", () => {
    expect(decodeValues(schema, "?somethingElse=1&count=8")).toEqual({
      count: 8,
    });
  });

  it("never restores uploads from a URL", () => {
    expect(decodeValues(schema, "?uploads=%5B%5D")).toEqual({});
  });

  it("round-trips a set of changed values", () => {
    const original = { count: 9, speed: 0.2, autoRotate: false, mode: "demo-videos" };
    const decoded = decodeValues(schema, encodeValues(schema, original));

    expect(decoded).toEqual(original);
  });
});
