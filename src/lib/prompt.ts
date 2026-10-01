import type { ComponentEntry } from "@/registry/schema";
import { getRegistrySources, type RegistrySourceFile } from "@/registry/sources";
import { installCommand } from "./site";

/**
 * Builds a single, self-contained prompt for pasting into an AI coding
 * assistant (Claude Code / Cursor / ChatGPT etc.) so it can add this
 * component to an existing project with nothing else: no shadcn CLI, no
 * network access, no second document to read.
 *
 * The prompt carries the component's shipped source files verbatim (the
 * same bytes the registry serves), so the assistant creates them directly
 * and the result matches the gallery exactly. The CLI stays as an
 * alternative for projects that have it.
 *
 * `code` is the exact generated-JSX string already shown in the CodePanel,
 * passed in rather than recomputed here, so the prompt always mirrors what
 * is currently on screen — including any host-specific TODO comments that
 * generateJsx already embeds (e.g. the <Canvas> requirement for r3f
 * components), so this function never needs to know about `entry.host`.
 */
export function generateAiPrompt(
  entry: ComponentEntry,
  code: string,
  options: { files?: RegistrySourceFile[] } = {},
): string {
  const { name, description, codegen, prompt } = entry;
  const files = options.files ?? getRegistrySources(entry.slug);
  const install = installCommand(entry.slug);

  // --- Component facts -----------------------------------------------------
  const factLines = [`- 名前: ${name}`, `- 説明: ${description}`];
  if (codegen.dependencies?.length) {
    factLines.push(
      `- 実行時に必要な npm パッケージ: ${codegen.dependencies.join(", ")}`,
    );
  }
  if (codegen.devDependencies?.length) {
    factLines.push(
      `- 型チェック・ビルドに必要な npm パッケージ（devDependencies）: ${codegen.devDependencies.join(", ")}`,
    );
  }
  if (files.length) {
    factLines.push(
      `- 構成ファイル: ${files.map((file) => `\`${file.path}\``).join(", ")}`,
    );
  }

  // --- Premises ------------------------------------------------------------
  const usesNext = files.some((file) => /from\s+["']next\//.test(file.content));
  const usesClientDirective = files.some((file) =>
    /^\s*["']use client["']/.test(file.content),
  );
  const premiseLines = [
    `- React 19 / TypeScript / Next.js（App Router）のプロジェクトを想定しています。${
      usesNext
        ? "このコンポーネントは `next/link` や `next/navigation` を使うため Next.js 専用です。Next.js 以外のプロジェクトでは、それらの import だけをそのルーターの同等機能に置き換えてください。"
        : "Next.js 以外の React プロジェクト（Vite など）でもそのまま動きます。"
    }`,
    "- スタイルは同梱の CSS Modules（ある場合）で自己完結しており、Tailwind CSS の有無や設定には依存しません。Tailwind の設定変更やグローバル CSS の追加は、この依頼文に明記された分だけにしてください。",
    usesClientDirective
      ? '- ブラウザ API やインタラクションを使うクライアントコンポーネントです。ファイル先頭の "use client" を維持してください。'
      : '- ブラウザ API やインタラクションを使うクライアントコンポーネントです。配置先が Server Component の場合は、"use client" を付けたファイルの中で使ってください。',
    "- コンポーネント自体の背景は透過です。配置先ページの背景がそのまま透けて見える前提で作られているので、白背景や単色の `div` などで囲わず、コンポーネントだけをそのまま配置してください。",
    "- ソースコードの内容は変更しないでください。例外は、`@/` パスエイリアスが無いプロジェクトで import パスを相対パスに直す場合だけです。",
  ];

  // --- Steps ---------------------------------------------------------------
  const steps: string[] = [];

  const installLines: string[] = [];
  if (codegen.dependencies?.length) {
    installLines.push(`npm install ${codegen.dependencies.join(" ")}`);
  }
  if (codegen.devDependencies?.length) {
    installLines.push(`npm install -D ${codegen.devDependencies.join(" ")}`);
  }
  steps.push(
    installLines.length
      ? `### 1. 依存パッケージを追加する\npnpm / yarn / bun を使っているプロジェクトでは、そのパッケージマネージャーのコマンドに置き換えてください。\n\`\`\`bash\n${installLines.join("\n")}\n\`\`\``
      : "### 1. 依存パッケージを追加する\n追加の npm パッケージは不要です（React のみ）。",
  );

  const fileBlocks = files
    .map((file) => `#### \`${file.path}\`\n${fence(file.content, languageOf(file.path))}`)
    .join("\n\n");
  steps.push(
    files.length
      ? `### 2. ファイルを作成する\n\`@/components\` が指すディレクトリ（多くは \`src/components/\` か \`components/\`。shadcn の \`components.json\` があれば \`aliases.components\` の指す場所）に、以下の ${files.length} ファイルを**一字一句そのまま**作成してください。\n\n${fileBlocks}\n\n代替手段: \`components.json\` がありシェルを実行できる環境なら、shadcn CLI でも同じファイルと依存パッケージが入ります。\n\`\`\`bash\n${install}\n\`\`\``
      : `### 2. ファイルを作成する\nshadcn CLI でコンポーネントのソースと依存パッケージを追加してください。\n\`\`\`bash\n${install}\n\`\`\``,
  );

  steps.push(
    `### 3. 使用例を配置する\n以下は配信元のプレイグラウンドで設定されていた値をそのまま反映した使用例です。これを基に、適切なページ・レイアウトへ配置してください。コード中の TODO コメントは、対応するか、何をすべきかを説明してください。\n\`\`\`tsx\n${code}\n\`\`\``,
  );

  if (prompt?.setup) {
    // Setup is a step, so its own headings sit one level below the step's.
    steps.push(`### 4. 組み込み手順\n${demoteHeadings(prompt.setup.trim())}`);
  }

  const doneLines = [
    "- 型チェックとビルド（`npm run build` 相当）が通る",
    "- 使用例を置いたページでコンポーネントが表示され、操作に反応する",
    '- "use client" が維持され、不透明な背景のラッパーが追加されていない',
    "- 使用例の TODO コメントが解消されている（または対応方法が説明されている）",
  ];
  if (prompt?.setup) {
    doneLines.push("- 「組み込み手順」にある作業がすべて済んでいる");
  }
  steps.push(
    `### ${prompt?.setup ? 5 : 4}. 完了条件\n${doneLines.join("\n")}`,
  );

  // --- Appendix ------------------------------------------------------------
  const specSection = prompt?.spec
    ? `\n\n## 付録: 見た目と挙動の仕様（レビュー用）\n正となるのは上のソースコードです。以下は、実装後に見た目と挙動がギャラリーと一致しているかを確認するための仕様です。ソースを使えない事情がある場合は、この仕様を満たすように同じコンポーネントを実装してください。\n${prompt.spec.trim()}`
    : "";

  return `# ${name} をこのプロジェクトに追加してください

このプロンプトは自己完結しています。コンポーネントのソースコード一式が下に含まれているので、外部サイトへのアクセスや shadcn CLI は不要です。手順どおりにファイルを作成し、依存パッケージを追加し、使用例を配置して、そのまま動作する状態にしてください。

## コンポーネントについて
${factLines.join("\n")}

## 前提と注意
${premiseLines.join("\n")}

## 手順
${steps.join("\n\n")}${specSection}`;
}

/** Pushes every Markdown heading in `markdown` down one level. */
function demoteHeadings(markdown: string): string {
  return markdown.replace(/^(#{1,5})(?=\s)/gm, "$1#");
}

/** Fenced-code language tag from a file name. */
function languageOf(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".") + 1);
  return ext === "ts" ? "tsx" : ext;
}

/**
 * Wraps `content` in a code fence long enough that no backtick run inside
 * the content can close it early.
 */
function fence(content: string, language: string): string {
  const longest = Math.max(
    2,
    ...(content.match(/`+/g) ?? []).map((run) => run.length),
  );
  const ticks = "`".repeat(longest + 1);
  const body = content.endsWith("\n") ? content.slice(0, -1) : content;
  return `${ticks}${language}\n${body}\n${ticks}`;
}
