/**
 * Prompt material for AuroraBackground (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same backdrop from scratch.
 */

export const setup = `
1. ヒーローの中身（見出し・バッジ・ボタン）を \`children\` として渡す: \`<AuroraBackground colors={[…]}>…</AuroraBackground>\`。ランドマークにしたい場合は \`as="section"\` と \`aria-label\` 付きの見出しを中に置く。
2. ルートは \`width: 100%; height: 100%\` で**親を埋める**。親に高さを与える（例: ラッパーに \`min-height: 100svh\`、または \`className\` で \`min-height\` を指定）。高さの無い親の中では中身の高さだけになる。
3. \`colors\` は 3〜5 色。ほぼ黒の下地にスクリーン合成するので、**明るく彩度の高い色**ほど映える。暗い色やグレーは沈んで見えない。2 色以下は既定色で補われ、6 色目以降は無視される。
4. 下地色はページ背景に合わせる。既定は \`#08080c\`。変えるときは \`className\` で CSS 変数 \`--ab-base\` を上書きする（例: \`.hero { --ab-base: #0a0a0a; }\`）。\`vignette\` のフェード先もこの色になる。
5. 中身の文字はオーロラの上に直接乗る。読みにくい場合は \`intensity\` を下げるか、文字色に白 .65 程度のコントラストを確保する。
6. \`"use client"\` コンポーネント（画面外で一時停止するための IntersectionObserver を使う）。Server Component から \`children\` 付きでそのまま使える。
7. \`npm run build\` が通ることを確認し、実機で「スクロールしてもカクつかない」「OS の視差効果を減らす設定で静止する」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ヒーローの高さが 0 になり何も見えない | \`container-type: size\` をルート（\`.root\`）に移した。size コンテナは中身から高さを取らない | size コンテナは**絶対配置のブロブ層（\`.aurora\`）だけ**に置く。ルートには付けない |
| Chrome で周辺フェードが効かない / 消える | \`mask-image\` と \`-webkit-mask-image\` を併記すると Next.js（Lightning CSS）が unprefixed を削ることがある | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 端に下地色の縁が出て、オーロラが内側に縮んで見える | ブロブ層の \`filter: blur()\` が端で下地色を引き込む | \`.aurora\` の \`transform: scale(1.15)\` を外さない（ぼかし分のはみ出し） |
| ページ全体の色が変わる / 下のセクションと混ざる | ルートの \`isolation: isolate\` を消すと \`mix-blend-mode: screen\` がページ背景と合成される | \`isolation: isolate\` を外さない |
| スクロールが重い・バッテリーを食う | \`left\` / \`top\` / \`background-position\` をアニメーションさせた、またはグレインを毎フレーム動かした | アニメーションは \`transform\` のみ。グレインは静止画のまま |
| ループの継ぎ目でブロブが跳ぶ | キーフレームの 0% と 100% が違うのに \`animation-direction: normal\` にした | \`alternate\` を維持する（往復するので継ぎ目が無い） |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。追加の npm 依存なし（純粋な CSS アニメーション）
- ファイル: \`components/aurora-background/AuroraBackground.tsx\`（\`"use client"\`）+ \`AuroraBackground.module.css\`
- Props: \`colors?: string[]\`（3〜5 色、既定 \`["#6d4aff", "#1fb6ff", "#ff4d9d", "#2ee6a8"]\`）、\`speed?: number\`（倍率、既定 1、0 で静止）、\`blur?: number\`（px、既定 80）、\`intensity?: number\`（0〜1、既定 0.8）、\`grain?: boolean\`（既定 true）、\`grainOpacity?: number\`（既定 0.12）、\`vignette?: boolean\`（既定 true）、\`className\`、\`children\`、\`as?: "div" | "section"\`
- 既定値は CSS 変数（\`--ab-c0〜c4\`、\`--ab-speed\`、\`--ab-blur\`、\`--ab-intensity\`、\`--ab-grain-opacity\`、\`--ab-base\`）としてルートクラスに持ち、既定と異なる値だけ inline style で上書きする

### 見た目
層構成は「下地 → ブロブ層 → グレイン → 中身」。

- **ルート（.root）**: \`position: relative; width: 100%; height: 100%; overflow: hidden; isolation: isolate\`、背景 \`var(--ab-base)\`（\`#08080c\`）、文字色 白
- **ブロブ層（.aurora）**: \`position: absolute; inset: 0; container-type: size\`、背景 \`var(--ab-base)\`、\`opacity: var(--ab-intensity)\`、\`filter: blur(var(--ab-blur))\`、\`transform: scale(1.15)\`（ぼかしで端が痩せないように）、\`aria-hidden\`
  - \`vignette\` 時は \`mask-image: radial-gradient(ellipse 70% 72% at 50% 38%, #000 30%, rgba(0,0,0,.55) 62%, transparent 100%)\` — 見出しの背後が最も明るく、端と下側がページへ溶ける
- **ブロブ（.blob、色ごとに 1 つ）**: \`border-radius: 50%\`、\`background: radial-gradient(closest-side, 色, transparent)\`、\`mix-blend-mode: screen\`。サイズはコンテナの長辺基準（\`cqmax\`）で、横長でも縦長でも同じ構図になる
  1. 左上: \`left -12% / top -22%\`、72×56cqmax、23s
  2. 右: \`left 52% / top 0\`、62×62cqmax、29s
  3. 下: \`left 12% / top 52%\`、76×46cqmax、37s
  4. 上中央: \`left 34% / top -18%\`、46×40cqmax、31s（逆方向）
  5. 左下: \`left -18% / top 44%\`、52×52cqmax、41s（逆方向）
  - 3 色でも画面が埋まるよう、先頭 3 つで四隅をカバーする順序にする
- **グレイン（.grain）**: inline SVG（\`feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3"\` + \`feColorMatrix type="saturate" values="0"\`）を 180px でタイル、\`mix-blend-mode: overlay\`、\`opacity: var(--ab-grain-opacity)\`。静止
- **中身（.content）**: \`position: relative; z-index: 2; height: 100%\`

### モーション
- 各ブロブは \`transform\`（translate3d / rotate / scale）だけのキーフレーム 3 種を使い分け、\`ease-in-out\`・\`infinite\`・\`alternate\`
  - 例: \`0% → translate(0,0) rotate(0) scale(1)\`、\`50% → translate(22%,14%) rotate(35deg) scale(1.12)\`、\`100% → translate(-8%,26%) rotate(-15deg) scale(.94)\`（% はブロブ自身のサイズ基準）
- 周期は互いに素に近い値（23 / 29 / 31 / 37 / 41s）にして、構図が繰り返して見えないようにする。\`animation-duration: calc(周期 / var(--ab-speed))\`
- 負の \`animation-delay\` で各ブロブを軌道の途中から開始し、初回描画から有機的な構図にする
- \`speed = 0\` と画面外（IntersectionObserver → \`data-offscreen\`）では \`animation-play-state: paused\`（フレーム 0 に戻さず、その場で止める）
- \`@media (prefers-reduced-motion: reduce)\` でも paused。負の delay のおかげで静止状態も途中の自然な構図になる

### アクセシビリティ
- 装飾レイヤー（ブロブ層・グレイン）はすべて \`aria-hidden="true"\`、\`pointer-events: none\`
- \`as="section"\` で使う場合は、中に見出しを置くか \`aria-labelledby\` を付ける
- 中身の文字のコントラストを確保する（本文は白 .65 以上を目安に）。動きは常にゆっくりで、点滅しない

### 受け入れ条件
- 親を全面で埋め、4 色のブロブが重なり合って溶けたメッシュグラデーションになる。輪郭や継ぎ目が見えない
- ゆっくり漂い、ループの継ぎ目で跳ばない。\`speed\` で速さが変わり、0 で静止する
- \`vignette\` で端と下側がページ背景へ自然にフェードする。\`grain\` でごく薄いノイズが乗り、バンディングが目立たない
- OS の「視差効果を減らす」で静止しても、構図は魅力的なまま
- スクロールで画面外に出るとアニメーションが止まる
`;
