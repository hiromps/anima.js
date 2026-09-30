import type { ComponentEntry } from "@/registry/schema";
import { installCommand } from "./site";

/**
 * Builds a single, self-contained prompt for pasting into an AI coding
 * assistant (Cursor / Claude Code / ChatGPT etc.) so it can add this
 * component to a Next.js (App Router) project.
 *
 * `code` is the exact generated-JSX string already shown in the CodePanel,
 * passed in rather than recomputed here, so the prompt always mirrors what
 * is currently on screen — including any host-specific TODO comments that
 * generateJsx already embeds (e.g. the <Canvas> requirement for r3f
 * components), so this function never needs to know about `entry.host`.
 */
export function generateAiPrompt(entry: ComponentEntry, code: string): string {
  const { name, description, codegen, prompt } = entry;
  const install = installCommand(entry.slug);

  // Component-specific material. Setup is numbered on from the install /
  // usage steps; the spec is a standalone appendix for building without
  // the registry.
  const setupSection = prompt?.setup
    ? `\n\n## 3. 組み込み手順（インストール後に必要な作業）\n${prompt.setup.trim()}`
    : "";
  const specSection = prompt?.spec
    ? `\n\n## 再現仕様（レジストリを使わずに実装する場合）\nレジストリからインストールできない場合は、以下の仕様を満たすように同じコンポーネントを実装してください。インストールできた場合は、レビューの参考にしてください。\n${prompt.spec.trim()}`
    : "";
  const setupAsk = prompt?.setup
    ? "「組み込み手順」にある作業もすべて済ませてください。"
    : "";

  const depsLines: string[] = [];
  if (codegen.dependencies?.length) {
    depsLines.push(
      `- 依存パッケージ（dependencies）: ${codegen.dependencies.join(", ")}`,
    );
  }
  if (codegen.devDependencies?.length) {
    depsLines.push(
      `- 開発時依存パッケージ（devDependencies）: ${codegen.devDependencies.join(", ")}`,
    );
  }
  const depsSection = depsLines.length ? `\n${depsLines.join("\n")}` : "";

  return `Next.js（App Router）プロジェクトに、以下の UI コンポーネントを追加してください。

## コンポーネントについて
- 名前: ${name}
- 説明: ${description}

## プロジェクトの前提
- Next.js の App Router を使用しています。
- このコンポーネントはブラウザ API やインタラクションを使うクライアントコンポーネントです。ファイルの先頭に "use client" を付けてください。
- プロジェクトのスタイリングは Tailwind CSS v4 です。コンポーネント本体のスタイルは同梱の CSS Modules（ある場合）で自己完結しているので、Tailwind の設定変更やグローバル CSS の追加は、この依頼文に明記された分だけにしてください。
- これは shadcn/ui の registry コンポーネントです。shadcn CLI（\`npx shadcn@latest add\`）を実行すると、ソース一式と依存パッケージが自動的にプロジェクトに追加されます。手動で組み込む場合も shadcn/ui の配置・命名規約に従ってください。${depsSection}
- コンポーネント自体の背景は透過です。配置先ページの背景がそのまま透けて見える前提で作られているので、白背景や単色の \`div\` などで囲わず、コンポーネントだけをそのまま配置してください。

## 1. インストール
シェルを実行できる場合は、以下のコマンドを実行してください。
\`\`\`bash
${install}
\`\`\`

## 2. 使用例
以下は現在プレイグラウンドで設定されている値をそのまま反映した使用例です。コンポーネントを配置する際の参考にしてください。
\`\`\`tsx
${code}
\`\`\`${setupSection}

## 依頼内容
上記を踏まえて、このコンポーネントをプロジェクトに追加し、そのまま動作する状態にしてください。"use client" の付与、Tailwind v4 との整合性、shadcn/ui の配置規約を確認し、コード中に TODO コメントがあれば対応方法も説明してください。${setupAsk}背景が透過であることを崩すような不透明な背景色・ラッパーは追加しないでください。${specSection}`;
}
