/**
 * Prompt material for ShinyText (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same effect from scratch.
 */

export const setup = `
1. \`<ShinyText text="…" variant="aurora" />\` のように置く。見出しなら \`as="h1"\` / \`"h2"\` を指定する（既定は \`<span>\`）。\`text\` の代わりに子要素の文字列 \`<ShinyText>…</ShinyText>\` でもよい（文字列のみ。リンクなどの要素は入れない）。
2. 文字サイズ・太さ・字間・行間は**親要素か \`className\` で指定する**。コンポーネントはフォントを継承し、色だけを自分で塗る。
3. \`variant\` を選ぶ: \`"shimmer"\`（くすんだ文字に光の帯が定期的に走る。バッジやラベル向け）、\`"gradient"\`（色が流れる）、\`"aurora"\`（柔らかく漂う + 背後の発光）、\`"metallic"\`（クロム + 反射の筋）。
4. 色は \`colors\`（2〜4 色）、シマーのくすんだ部分は \`baseColor\`。既定値は暗い背景向けなので、明るいページでは \`baseColor\` を濃くする。
5. \`"use client"\` はコンポーネント側に付いているので、Server Component の中に直接置いてよい。
6. \`npm run build\` が通ることを確認し、本番ビルドの CSS で \`background-clip: text\`（または \`-webkit-background-clip: text\`）が残っていること、「OS の視差効果を減らす設定で静止したグラデーションになる」「文字を選択・コピーできる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 文字ではなく四角い背景全体がグラデーションになる | \`background\` ショートハンドを \`background-clip\` の後に書くとクリップがリセットされる | \`background-image\` / \`-size\` / \`-position\` のロングハンドだけを使う |
| 古いブラウザで文字の後ろに色の箱が出る / 文字が消える | \`color: transparent\` とグラデーションを無条件に当てている | どちらも \`@supports (background-clip: text) or (-webkit-background-clip: text)\` の中だけに書き、外では読める単色（\`--st-fallback\`）にする |
| ビルド後にクリップが効かない | Lightning CSS がプレフィックス付き / なしの組を 1 つにまとめることがある | \`-webkit-background-clip: text\` と \`background-clip: text\` の**両方を書く**。どちらが残っても主要ブラウザ（Firefox 含む）で効く |
| 文字が濁る・黒ずむ | \`text-shadow\` が透明な文字の下から透けて見える | 発光は \`glow\`（ぼかした複製レイヤー）を使い、\`text-shadow\` は付けない |
| g や y の下、濁点が切れる | 背景の塗り範囲は行ボックスまでなので、詰めた行間ではグリフがはみ出す | インラインの \`.text\` に \`padding-block: .12em\` を残す（インラインの padding はレイアウトを動かさない） |
| 2 行目以降のグラデーションが間延びする | 既定の \`box-decoration-break: slice\` は全行を 1 本の帯として塗る | \`box-decoration-break: clone\`（unprefixed のみ。Firefox は \`-webkit-\` 版を解釈しない） |
| スクリーンリーダーが同じ文を 2 回読む | 発光用の複製が読み上げ対象になっている | 複製レイヤーは \`aria-hidden\`。本文は普通のテキストのまま |
| 文中の \`<span>\` で発光をオンにすると改行されない | 発光時は複製と重ねるため \`inline-grid\` になり、周囲の文と一緒には折り返さない | 段落の途中では \`glow={false}\`、または見出し単位で使う |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。依存パッケージなし（純 CSS + IntersectionObserver）
- ファイル: \`components/shiny-text/index.tsx\`（\`"use client"\`）+ \`ShinyText.module.css\`
- Props: \`text\` / \`children\`（文字列、\`text\` 優先）、\`variant\`（\`"shimmer" | "gradient" | "aurora" | "metallic"\`、既定 \`"shimmer"\`）、\`colors\`（2〜4 色、既定 \`#a78bfa, #f472b6, #60a5fa\`）、\`baseColor\`（既定 \`#8e8a9f\`）、\`speed\`（秒/周期）、\`angle\`（deg、既定 110）、\`as\`（\`"span" | "h1" | "h2" | "p"\`）、\`glow\`（既定: オーロラのみ true）、\`className\`
- CSS 変数 \`--st-c1〜3\` / \`--st-stops\` / \`--st-base\` / \`--st-speed\` / \`--st-angle\` / \`--st-fallback\` の既定値はルートのクラスに持ち、既定と違う値だけをインラインで渡す。2 色・4 色のときは \`--st-stops\` を「色…, 先頭の色」で書き出す（先頭で閉じてループを滑らかにする）

### 見た目
- 構造: ルート（\`as\`）> [発光 \`.glowLayer\`（\`aria-hidden\`）] + \`.layer\` > インラインの \`.text\`。グラデーションは \`.text\` の背景で、\`background-clip: text\` で文字形に切り抜く
- \`.text\`: \`color: var(--st-fallback)\`、\`padding-block: .12em\`、\`box-decoration-break: clone\`。\`@supports\` 内でのみ \`color: transparent\` + 背景 + \`-webkit-background-clip: text; background-clip: text\` + \`background-repeat: no-repeat\`
- **shimmer**: \`linear-gradient(angle, base 0–41%, mix(c1 75%, base) 46%, #fff 50%, mix(c2 75%, base) 54%, base 59–100%)\`、\`background-size: 300% 100%\`。フォールバックは \`baseColor\`
- **gradient**: \`linear-gradient(angle, c1, c2, c3, c1)\`、\`300% 100%\`。フォールバックは c1
- **aurora**: \`radial-gradient(60% 80% at 30% 40%, c2 55%, transparent 70%)\` を \`linear-gradient(angle, stops)\` の上に重ね、\`220% 220%\`。フォールバックは c1
- **metallic**: 上に反射の筋 \`linear-gradient(angle, transparent 44%, 白 .95 50%, transparent 56%)\`（\`300% 100%\`）、下にクロム \`linear-gradient(180deg, #fbfcfd 0%, #e3e6ec 28%, mix(c1 20%, #6c717d) 52%, #aeb4bf 66%, #eef0f4 88%, #fff 100%)\`。フォールバックは \`#dfe3ea\`
- **発光**: ルートを \`display: grid\`（span は \`inline-grid\`）+ \`isolation: isolate\`、複製と本文を同じセル（\`grid-area: 1/1\`）に重ねる。複製は \`filter: blur(.22em) saturate(1.25)\`、\`opacity: .6\`、\`pointer-events: none\`、\`user-select: none\`。クリップ非対応環境では非表示

### モーション
- すべて \`background-position\` のアニメーション、周期は \`--st-speed\`
- shimmer: \`100% 0 → 0% 0\`（0〜60%、\`cubic-bezier(.45,0,.2,1)\`）、残り 40% は休止。既定 3 秒
- gradient: \`0% 50% ↔ 100% 50%\`、ease-in-out・alternate。既定 6 秒
- aurora: \`0% 50% → 100% 20% → 60% 100% → 0% 50%\`、ease-in-out。既定 8 秒
- metallic: 反射の筋だけ \`100% → 0%\`（0〜55%）、クロムは固定。既定 4 秒
- 画面外では IntersectionObserver がルートに \`data-paused\` を付け、\`animation-play-state: paused\`（React の再レンダリングなし）
- \`prefers-reduced-motion: reduce\`: アニメーションなし。shimmer は帯を中央（\`50% 0\`）、gradient / aurora は \`50% 50%\`、metallic は筋を \`42%\` に置いた静止状態

### アクセシビリティ
- 本文は普通のテキストとして DOM に残る（選択・コピー・翻訳・読み上げ可）。発光の複製は \`aria-hidden\`
- 見出しは \`as\` で正しいタグにする
- フォールバック色・\`baseColor\` は暗い背景でコントラスト 4.5:1 以上を保つ値にする

### 受け入れ条件
- 4 つのバリエーションがそれぞれ説明どおりに動き、文字の外に背景が塗られない
- \`colors\` に 2 色・4 色を渡しても切れ目なくループする
- 複数行でも各行に同じグラデーションがかかり、ディセンダー・濁点が欠けない
- \`background-clip: text\` 非対応環境では単色で読める
- 視差効果を減らす設定で静止し、画面外ではアニメーションが止まる
- スクリーンリーダーが本文を 1 回だけ読む
`;
