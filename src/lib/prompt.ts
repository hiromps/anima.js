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
  const { name, description, codegen } = entry;
  const install = installCommand(entry.slug);

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
- スタイリングは Tailwind CSS v4 です。追加設定なしのユーティリティクラスのみで組んでください。
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
\`\`\`

## 依頼内容
上記を踏まえて、このコンポーネントをプロジェクトに追加し、そのまま動作する状態にしてください。"use client" の付与、Tailwind v4 との整合性、shadcn/ui の配置規約を確認し、コード中に TODO コメントがあれば対応方法も説明してください。背景が透過であることを崩すような不透明な背景色・ラッパーは追加しないでください。`;
}
