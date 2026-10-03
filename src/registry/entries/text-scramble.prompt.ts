/**
 * Prompt material for TextScramble (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same effect from scratch.
 */

export const setup = `
1. 見出しなら \`<TextScramble as="h1" text="…" />\` のように \`as\` で正しいタグを指定する。既定は \`<span>\` なので、段落の一部や既存の見出しの中にもそのまま置ける。
2. 文字サイズ・太さ・色・字間は**親要素か \`className\` で指定する**。コンポーネントはフォントを継承し、自分ではサイズを持たない。
3. トリガーを選ぶ: \`"mount"\`（画面に入ったら 1 回）、\`"hover"\`（ホバー / フォーカスのたびに再生）、\`"loop"\`（\`phrases\` を順に切り替え）。\`"hover"\` をリンクやボタンの中に置くと、その要素へのホバー・キーボードフォーカスでも再生される。
4. 日本語は \`glyphs="auto"\`（既定）のままでよい。全角文字はカタカナ、半角文字は英数字で崩れるので、グリフが文字の枠からはみ出さない。
5. \`"use client"\` はコンポーネント側に付いているので、Server Component の中に直接置いてよい。
6. \`npm run build\` が通ることを確認し、「OS の視差効果を減らす設定で最終テキストが即表示される」「スクリーンリーダーで崩れた文字ではなく本文が読まれる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 崩れている間に行の幅がガタガタ揺れる | グリフを本来の文字と入れ替えて描画している | 本来の文字（\`.final\`）は常にフローに残して \`visibility\` で隠し、グリフは \`position: absolute\` で中央に重ねる |
| 英単語の途中で改行される | 1 文字ずつ inline-block にすると、文字の間すべてが改行位置になる | 半角の単語は \`white-space: nowrap\` のグループで包む（同梱の \`tokenize\` を外さない） |
| 行頭に「。」「、」が来る | 全角文字を 1 文字ずつ独立させている | 閉じ括弧・句読点は直前の文字と同じ nowrap グループに入れる |
| 毎フレーム再レンダリングで重い | アニメーションの状態を React state に持っている | 状態は \`data-s\` 属性とグリフの \`textContent\` に rAF から直接書く。React は構造をフレーズごとに 1 回描くだけ |
| 読み込み直後に完成テキストが一瞬見えてから崩れる | 初期状態を \`useEffect\` で入れている | \`useLayoutEffect\` で描画前に「非表示」状態を入れる |
| スクリーンリーダーが記号の羅列を読む | アニメーション用の文字が読み上げ対象になっている | 文字の層は \`aria-hidden\`、本文は視覚的に隠した \`<span>\` に入れる（\`aria-label\` は \`<p>\` / \`<span>\` では無視される） |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。外部ライブラリなし（requestAnimationFrame と IntersectionObserver のみ）
- ファイル: \`components/text-scramble/TextScramble.tsx\`（\`"use client"\`）+ \`TextScramble.module.css\` + \`index.ts\`
- props: \`text\`、\`phrases\`（string[]）、\`trigger\`（\`"mount"\` / \`"hover"\` / \`"loop"\`、既定 \`"mount"\`）、\`duration\`（ms、既定 1400）、\`speed\`（グリフの切り替え回数 / 秒、既定 22）、\`pause\`（ループの静止時間 ms、既定 2400）、\`glyphs\`（\`"auto"\` / \`"latin"\` / \`"katakana"\` / \`"symbols"\` / 任意の文字列、既定 \`"auto"\`）、\`as\`（\`h1\`〜\`h4\` / \`p\` / \`span\` / \`div\`、既定 \`span\`）、\`accentColor\`（既定 \`#9aa8ff\`）、\`monospace\`、\`className\`
- アクセント色の既定値は CSS のカスタムプロパティ \`--ts-accent\` が持ち、既定以外の値のときだけインラインで上書きする

### 見た目
- フォント・サイズ・色は親から継承。\`monospace\` のときだけ \`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", "Noto Sans Mono CJK JP", monospace\`、\`tabular-nums\`、字間 -0.02em
- 文字ごとに \`<span class="cell">\`（\`display: inline-block; position: relative; vertical-align: top\`）。中に 2 層:
  - \`.final\` 本来の文字。常にフローに残るので、枠の幅は最終文字の幅で固定される
  - \`.glyph\` ランダムなグリフ。\`position: absolute; top: 0; left: 50%; transform: translateX(-50%)\`、色 \`--ts-accent\`、opacity .72、\`text-shadow: 0 0 .45em\`（アクセント 55%）
- 状態は \`.cell\` の \`data-s\` 属性: \`h\`（非表示、枠は維持）/ \`s\`（崩れ中: \`.final\` を \`visibility: hidden\`、\`.glyph\` を表示）/ \`r\`（確定直後）/ なし（静的なテキスト。SSR の初期状態）
- 確定の瞬間 (\`r\`): \`.final\` に 520ms \`cubic-bezier(.22,1,.36,1)\` のキーフレーム。アクセント色 + 発光 + opacity .6 から通常の色へ戻る。\`r\` はアニメーションからしか付かないので、SSR の静的テキストは光らない
- 改行: 半角の単語は \`white-space: nowrap\` のグループ、全角文字は 1 文字ずつ（どこでも改行可）。ただし \`、。，．！？）」』】〉》〕・ー〜…\` は直前の文字と同じグループに入れて行頭に来させない。空白は崩さずそのまま出力
- グリフ \`"auto"\`: 全角文字（CJK・かな・全角記号）はカタカナ、それ以外は英数字 + \`#$%&*+<>/=?\` から選ぶ。サロゲートペアは \`Array.from\` で 1 文字として扱う

### モーション
- すべて rAF。状態は DOM の \`data-s\` とグリフの \`textContent\` に直接書き、React state は毎フレーム更新しない。グリフは \`1000 / speed\` ms ごとに差し替え
- **入り（in）**: 文字 i の位置 \`t = i / (n − 1)\`。表示開始 \`duration × 0.3 × t\`（左から順に現れる。ホバー時は全文字が即崩れ始める）、確定 \`duration × (0.35 + 0.65 × t)\` ± \`duration × 4%\` のランダムなずれ（タイプライターっぽさを消す）
- **出（out、ループのみ）**: 長さ \`min(700, duration × 0.45)\`。文字 i は \`out × 0.5 × t\` で崩れ始め、さらに \`out × 0.5\` 後に消える
- **mount**: 描画前（\`useLayoutEffect\`）に全文字を \`h\` にし、IntersectionObserver（\`rootMargin: 0px 0px -12% 0px\`）で画面に入ったら 1 回だけ「入り」
- **hover**: 初期は完成テキスト。\`closest('a[href], button, [role="button"], [tabindex]')\`（無ければ自身）の \`pointerenter\` / \`focusin\` で「入り」。再生中は無視
- **loop**: 入り → \`pause\` ms 静止 → 出 → 次のフレーズ。画面外に出たら停止して全文字を隠し、戻ったら現在のフレーズの「入り」からやり直す
- \`prefers-reduced-motion: reduce\`: アニメーションせず最終テキストを即表示。ループは最初のフレーズで止める（タイマーで文字が変わり続けるのも動きで、止める手段がないため）。CSS 側でも確定時のキーフレームを無効化

### アクセシビリティ
- 本文は視覚的に隠した \`<span>\`（\`clip-path: inset(50%)\` 方式）に入れ、アニメーション用の文字の層はまるごと \`aria-hidden\`。\`aria-label\` は \`<p>\` / \`<span>\` では読まれないので使わない
- ループでは隠しテキストも現在のフレーズに更新する（ライブリージョンにはしない — 数秒ごとの読み上げは邪魔になる）
- テキスト自体をフォーカス可能にはしない。ホバー再生は親のリンク / ボタンのフォーカスでも起動する

### 受け入れ条件
- 崩れている間も行の幅・改行位置が一切変わらない（日本語・英語とも）
- 文字が左から順にアクセント色のグリフから確定し、確定の瞬間に淡く光る
- \`"loop"\` で 3 つのフレーズ（日本語を含む）が「入り → 静止 → 出」で切り替わり、画面外では止まる
- \`"hover"\` でホバー・キーボードフォーカスのたびに再生される
- 視差効果を減らす設定では完成テキストが即表示され、ループも止まる
- スクリーンリーダーで本文が 1 回だけ、正しく読まれる
`;
