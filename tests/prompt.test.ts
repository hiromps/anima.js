import { describe, expect, it } from "vitest";
import { generateAiPrompt } from "@/lib/prompt";
import { installCommand } from "@/lib/site";
import type { ComponentEntry } from "@/registry/schema";
import type { RegistrySourceFile } from "@/registry/sources";

function makeEntry(
  codegen: Record<string, unknown> = {},
  extra: Partial<ComponentEntry> = {},
): ComponentEntry {
  return {
    ...extra,
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

const FILES: RegistrySourceFile[] = [
  {
    path: "components/demo/index.tsx",
    content: '"use client";\n\nexport function Demo() {\n  return <div />;\n}\n',
  },
  {
    path: "components/demo/Demo.module.css",
    content: ".root {\n  color: red;\n}\n",
  },
];

describe("generateAiPrompt", () => {
  it("embeds every shipped file verbatim, with its path and language", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />", { files: FILES });
    expect(prompt).toContain("#### `components/demo/index.tsx`\n```tsx\n");
    expect(prompt).toContain(
      '"use client";\n\nexport function Demo() {\n  return <div />;\n}\n```',
    );
    expect(prompt).toContain("#### `components/demo/Demo.module.css`\n```css\n");
    expect(prompt).toContain(".root {\n  color: red;\n}\n```");
    expect(prompt).toContain("以下の 2 ファイルを**一字一句そのまま**作成");
  });

  it("widens the code fence when a file contains backtick runs", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />", {
      files: [{ path: "components/demo/index.tsx", content: "const s = ```x```;\n" }],
    });
    expect(prompt).toContain("````tsx\nconst s = ```x```;\n````");
  });

  it("still offers the CLI as an alternative, not the main path", () => {
    const entry = makeEntry();
    const prompt = generateAiPrompt(entry, "<Demo />", { files: FILES });
    const filesAt = prompt.indexOf("### 2. ファイルを作成する");
    const cliAt = prompt.indexOf(installCommand(entry.slug));
    expect(filesAt).toBeGreaterThan(-1);
    expect(cliAt).toBeGreaterThan(filesAt);
    expect(prompt).toContain("代替手段");
  });

  it("falls back to the CLI alone when no files are known", () => {
    const entry = makeEntry();
    const prompt = generateAiPrompt(entry, "<Demo />", { files: [] });
    expect(prompt).toContain(installCommand(entry.slug));
    expect(prompt).not.toContain("一字一句そのまま");
    expect(prompt).not.toContain("構成ファイル");
  });

  it("embeds the passed-in code verbatim", () => {
    const code = 'import { Demo } from "@/components/demo";\n\n<Demo count={2} />';
    const prompt = generateAiPrompt(makeEntry(), code, { files: FILES });
    expect(prompt).toContain(`\`\`\`tsx\n${code}\n\`\`\``);
  });

  it("includes the component name, description and file list", () => {
    const entry = makeEntry();
    const prompt = generateAiPrompt(entry, "<Demo />", { files: FILES });
    expect(prompt).toContain(`# ${entry.name} をこのプロジェクトに追加してください`);
    expect(prompt).toContain(entry.description);
    expect(prompt).toContain(
      "- 構成ファイル: `components/demo/index.tsx`, `components/demo/Demo.module.css`",
    );
  });

  it("states the premises: App Router, use client, CSS Modules, transparent background", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />", { files: FILES });
    expect(prompt).toContain("App Router");
    expect(prompt).toContain('ファイル先頭の "use client" を維持');
    expect(prompt).toContain("CSS Modules");
    expect(prompt).toContain("Tailwind CSS の有無や設定には依存しません");
    expect(prompt).toContain("背景は透過");
    expect(prompt).toContain("不透明な背景のラッパーが追加されていない");
  });

  it("flags Next.js-only components from their imports", () => {
    const nextOnly = generateAiPrompt(makeEntry(), "<Demo />", {
      files: [
        {
          path: "components/demo/index.tsx",
          content: 'import Link from "next/link";\nexport const Demo = () => <Link href="/" />;\n',
        },
      ],
    });
    expect(nextOnly).toContain("Next.js 専用です");

    const portable = generateAiPrompt(makeEntry(), "<Demo />", { files: FILES });
    expect(portable).toContain("Vite など）でもそのまま動きます");
  });

  it("turns dependencies into install commands, and says so when there are none", () => {
    const withDeps = generateAiPrompt(
      makeEntry({ dependencies: ["three"], devDependencies: ["@types/three"] }),
      "<Demo />",
      { files: FILES },
    );
    expect(withDeps).toContain("- 実行時に必要な npm パッケージ: three");
    expect(withDeps).toContain("npm install three\nnpm install -D @types/three");

    const withoutDeps = generateAiPrompt(makeEntry(), "<Demo />", { files: FILES });
    expect(withoutDeps).toContain("追加の npm パッケージは不要です");
    expect(withoutDeps).not.toContain("npm install ");
  });

  it("numbers the setup steps in, and makes them part of the done criteria", () => {
    const prompt = generateAiPrompt(
      makeEntry(
        {},
        {
          prompt: {
            setup: "1. layout.tsx に配置する\n",
            spec: "- 高さ 62px のガラスのバー\n",
          },
        },
      ),
      "<Demo />",
      { files: FILES },
    );
    const setupAt = prompt.indexOf("### 4. 組み込み手順");
    const doneAt = prompt.indexOf("### 5. 完了条件");
    const specAt = prompt.indexOf("## 付録: 見た目と挙動の仕様");
    expect(setupAt).toBeGreaterThan(-1);
    expect(prompt).toContain("1. layout.tsx に配置する");
    expect(prompt).toContain("- 高さ 62px のガラスのバー");
    expect(setupAt).toBeLessThan(doneAt);
    expect(specAt).toBeGreaterThan(doneAt);
    expect(prompt).toContain("「組み込み手順」にある作業がすべて済んでいる");
  });

  it("demotes the setup text's own headings below the step heading", () => {
    const prompt = generateAiPrompt(
      makeEntry({}, { prompt: { setup: "1. 配置する\n\n### ハマりどころ\n- 注意\n" } }),
      "<Demo />",
      { files: FILES },
    );
    expect(prompt).toContain("### 4. 組み込み手順\n1. 配置する\n\n#### ハマりどころ\n- 注意");
    expect(prompt).not.toContain("\n### ハマりどころ");
  });

  it("leaves the optional sections out when the entry has none", () => {
    const prompt = generateAiPrompt(makeEntry(), "<Demo />", { files: FILES });
    expect(prompt).not.toContain("組み込み手順");
    expect(prompt).not.toContain("付録");
    expect(prompt).toContain("### 4. 完了条件");
  });

  it("reads the real sources for a registry slug when none are passed", () => {
    const entry = { ...makeEntry(), slug: "glass-bottom-tab-bar" } as ComponentEntry;
    const prompt = generateAiPrompt(entry, "<Demo />");
    expect(prompt).toContain("#### `components/glass-bottom-tab-bar/index.tsx`");
    expect(prompt).toContain("export function GlassBottomTabBar(");
    expect(prompt).toContain("#### `components/glass-bottom-tab-bar/GlassBottomTabBar.module.css`");
  });
});
