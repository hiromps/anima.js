import { describe, expect, it } from "vitest";
import { generateAiPrompt } from "@/lib/prompt";
import { installCommand } from "@/lib/site";
import type { ComponentEntry } from "@/registry/schema";

function makeEntry(codegen: Record<string, unknown> = {}): ComponentEntry {
  return {
    slug: "demo",
    name: "Demo",
    description: "デモ用の説明文。",
    category: "carousel",
    tech: ["css-3d"],
    host: "dom",
    schema: {},
    component: () => null,
    codegen: {
      componentName: "Demo",
      importPath: "@/components/demo",
      ...codegen,
    },
  } as unknown as ComponentEntry;
}

describe("generateAiPrompt", () => {
  it("includes the install command", () => {
    const entry = makeEntry();
    const prompt = generateAiPrompt(entry, "<Demo />");
    expect(prompt).toContain(installCommand(entry.slug));
  });

  it("embeds the passed-in code verbatim", () => {
    const code = 'import { Demo } from "@/components/demo";\n\n<Demo count={2} />';
    const prompt = generateAiPrompt(makeEntry(), code);
    expect(prompt).toContain(code);
  });

  it("includes the component name and description", () => {
    const entry = makeEntry();
    const prompt = generateAiPrompt(entry, "<Demo />");
    expect(prompt).toContain(entry.name);
    expect(prompt).toContain(entry.description);
  });

  it("mentions the Next.js / use client / Tailwind v4 context", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />");
    expect(prompt).toContain("App Router");
    expect(prompt).toContain('"use client"');
    expect(prompt).toContain("Tailwind CSS v4");
  });

  it("notes that the component background is transparent", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />");
    expect(prompt).toContain("背景は透過");
    expect(prompt).toContain("不透明な背景色・ラッパーは追加しないでください");
  });

  it("lists dependencies and devDependencies only when present", () => {
    const withDeps = generateAiPrompt(
      makeEntry({ dependencies: ["three"], devDependencies: ["@types/three"] }),
      "<Demo />",
    );
    expect(withDeps).toContain("three");
    expect(withDeps).toContain("@types/three");

    const withoutDeps = generateAiPrompt(makeEntry(), "<Demo />");
    expect(withoutDeps).not.toContain("dependencies）:");
  });
});
