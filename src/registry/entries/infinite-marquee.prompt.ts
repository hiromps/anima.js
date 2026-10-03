/**
 * Prompt material for InfiniteMarquee (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same marquee from scratch.
 */

export const setup = `
1. 流したい要素を \`children\` として並べる: \`<InfiniteMarquee aria-label="導入企業">{logos}</InfiniteMarquee>\`。\`children\` の直下の要素がそれぞれ 1 アイテムになる（ラッパーで 1 つにまとめない）。
2. 親要素に幅を与える（ブロック要素なら通常は自動で 100%）。中身が少なくても、コンポーネントがコンテナ幅を覆うまで自動で複製する。
3. 速度は \`speed\`（px/秒）で指定する。アイテムを増減しても体感速度は変わらない。
4. \`variant="band"\` を使う場合、帯は親より 10% 広く・傾けて描かれるので、**親に \`overflow: hidden\`（または \`overflow: clip\`）を指定**する。文字サイズは帯の幅に追従する（\`cqi\`）。
5. 縦に流す場合は \`vertical\` を付け、\`className\` などで高さを与える（未指定時は 360px）。
6. リンクやボタンを流す場合、最初の 1 周分だけがフォーカス可能で、複製は \`aria-hidden\` + \`inert\`。フォーカス中とホバー中（\`pauseOnHover\`）は止まる。
7. \`npm run build\` が通ることを確認し、「ループの継ぎ目でガクッとしない」「ウィンドウを広げても隙間が出ない」「OS の視差効果を減らす設定で止まる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 1 周ごとにガクッと戻る | トラックの 2 つの半分の長さが違う / 最後のアイテムの後ろに gap が無い | 各パスは \`padding-inline-end: gap\` で「アイテム…gap」の長さに揃えてある。\`gap\` をパス同士の \`gap\` に置き換えない（-50% がずれる） |
| Chrome で端のフェードが効かない | \`mask-image\` と \`-webkit-mask-image\` を併記すると Next.js（Lightning CSS）が unprefixed を削ることがある | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 広い画面で右端に空白が出る | 複製数が固定 | ResizeObserver でパス長とコンテナ幅を測り、\`ceil(コンテナ / パス長)\` 個を 1 セットにして 2 セット描画する仕組みを外さない |
| アイテム数で速度が変わる | \`animation-duration\` を固定値にしている | 周期 = セット長 ÷ \`speed\`。測定値から算出している部分を残す |
| スクリーンリーダーが同じ内容を何度も読む | 複製に \`aria-hidden\` / \`inert\` が無い | 2 つ目以降のパスの \`aria-hidden\` と \`inert\` を外さない |
| 帯の端に三角の隙間が見える | 帯の幅を 100% に戻した | 帯は \`inline-size: 110%\` + \`margin-inline: -5%\`。傾きを大きくする場合は幅も広げる |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。ランタイム依存なし（アニメーションは CSS）
- ファイル: \`components/infinite-marquee/InfiniteMarquee.tsx\`（\`"use client"\`）+ \`InfiniteMarquee.module.css\`
- props: \`children\`、\`speed\`（px/秒、既定 60）、\`direction\`（\`"left" | "right"\`、既定 left）、\`pauseOnHover\`（既定 true）、\`fade\`（既定 true）、\`fadeWidth\`（px、既定 96）、\`gap\`（px、既定 48）、\`vertical\`、\`variant\`（\`"plain" | "band"\`、既定 plain）、\`bandColor\`（既定 \`#d4ff3f\`）、\`bandRotate\`（deg、既定 -3）、\`className\`、\`aria-label\`
- 既定値は CSS 変数（\`--im-gap\` / \`--im-fade\` / \`--im-band-color\` / \`--im-band-ink\` / \`--im-band-rotate\` / \`--im-duration\`）としてルートに持ち、既定と異なる値だけ inline style で上書きする

### 構造
- ルート（帯の色と傾き）→ ビューポート（\`overflow: hidden\`、フェードのマスク）→ トラック（\`display: flex; width: max-content\`、アニメーション対象）→ パス（\`children\` を 1 周分、\`display: flex; gap; padding-inline-end: gap; white-space: nowrap\`）
- パス長 \`size\` とビューポート幅 \`box\` を ResizeObserver で測り（\`offsetWidth\` / \`clientWidth\` = 回転の影響を受けないレイアウト値）、\`copies = ceil(box / size)\`（上限 24）。トラックには \`copies × 2\` 個のパスを描画 → 半分が必ずコンテナ以上の長さになり、全体は 2 倍以上を覆う
- 1 個目のパス以外はすべて \`aria-hidden\` + \`inert\`
- \`aria-label\` があればルートを \`role="group"\` にする（ランドマークは増やさない）

### 見た目
- **plain**: 子要素のスタイルに任せる。アイテムは \`flex: none\` で縦中央揃え
- **フェード**: ビューポートに \`mask-image: linear-gradient(to right, transparent, #000 fadeWidth, #000 calc(100% - fadeWidth), transparent)\`（縦は to bottom）。オーバーレイではなくマスクなので背景色を問わない
- **band**: ルートに \`background: bandColor\`、\`rotate: bandRotate\`、\`inline-size: 110%; margin-inline: -5%\`（傾けても端が見えない）、\`padding-block: .9em\`、\`container-type: inline-size\`
  - 文字: \`font-size: clamp(30px, 6.4cqi, 96px)\`、800、\`line-height: 1\`、\`letter-spacing: -0.035em\`、大文字。文字色は帯の相対輝度 > 0.36 なら \`#0a0a0a\`、それ以外は \`#fafafa\`
  - 光沢: \`::before\` に上から白 .28 → 0（38%）、下端に黒 .14 のグラデーション + \`inset 0 1px 0 白 .45\`
  - 質感: \`::after\` に SVG の fractalNoise（opacity .16、\`mix-blend-mode: overlay\`）
  - 影: \`0 24px 60px -18px\` 帯の色 55% の発光 + \`0 14px 30px -12px rgba(0,0,0,.55)\`
  - 区切り記号（✦ など）は子要素として渡し、\`aria-hidden\` にする

### モーション
- \`@keyframes\` で \`translate3d(0,0,0) → translate3d(-50%,0,0)\`（縦は Y）、\`linear infinite\`。\`direction="right"\` は \`animation-direction: reverse\`
- 周期 = \`(size × copies) / speed\` 秒。測定が終わるまでアニメーションを付けない（仮の速度で走らせない）
- \`pauseOnHover\`: ビューポートの \`:hover\` と \`:focus-within\` で \`animation-play-state: paused\`（その場で止まり、再開時に跳ばない）
- IntersectionObserver で画面外にある間は一時停止
- \`prefers-reduced-motion: reduce\`: アニメーションなし、複製を描画せず 1 周分だけを中央寄せ。はみ出す分はビューポートを \`overflow: auto\` のスクロール領域にし、\`tabIndex={0}\` とフォーカスリングでキーボードからも読めるようにする（マスクは外す）

### アクセシビリティ
- 内容は 1 回だけ読み上げられる（複製は \`aria-hidden\` + \`inert\`、Tab でも到達しない）
- 動く内容はホバー / フォーカスで止まり、視差効果を減らす設定では完全に静止する

### 受け入れ条件
- ループの継ぎ目が見えない（ガクッとしない）
- アイテムが 2〜3 個でも、ワイドな画面で隙間なく埋まる
- アイテムを増やしても速度（px/秒）が変わらない
- \`direction\` を変えると逆に流れる。ホバーで止まる
- band で傾いた色帯の端が親の中で途切れて見えない
`;
