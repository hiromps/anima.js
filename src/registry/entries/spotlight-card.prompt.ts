/**
 * Prompt material for SpotlightCard (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same card from scratch.
 */

export const setup = `
1. 中身を子要素として渡して置く: \`<SpotlightCard><h3>…</h3><p>…</p></SpotlightCard>\`。コンポーネント自体が \`"use client"\` なので、Server Component からそのまま使える。
2. 複数枚を並べる場合は \`<SpotlightGrid>\` で囲む。ポインター位置をグリッド全体で 1 つだけ追跡し、近づいた隣のカードの枠線も光る（Linear の機能紹介グリッドの挙動）。既定のレイアウトは \`repeat(auto-fit, minmax(min(100%, 240px), 1fr))\`・\`gap: 12px\`。
3. リストにするなら \`<SpotlightGrid as="ul">\` + \`<SpotlightCard as="li">\`、カード全体をリンクにするなら \`<SpotlightCard as="a" href="…">\`（\`:focus-visible\` でリングが出る）。
4. 内側の余白や面の色はクラスから CSS 変数で上書きする: \`--sc-padding\`（既定 24px）、\`--sc-surface\`（既定 #0c0c0f）。色・大きさ・強さ・角丸は props で渡す。
5. 中身の文字色・フォントは \`color: #ededef\` とシステムフォントを継承する。見出しなどのスタイルは子要素側で付ける。
6. \`npm run build\` が通ることを確認し、マウスで「枠線と面の光がポインターに追従する」「離すと左上の待機位置の明るさに戻る」、スマホで「タップしても光が飛ばず、待機状態のまま」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 枠線だけでなくカード全体がぼんやり光る | 面（\`.surface\`）の背景を半透明にした | 面は**不透明のまま**にする。枠線の光は面の下にあり、外周 1px だけが見える仕組み |
| ポインターを動かすとカクつく / 再レンダーが走る | 座標を React の state で持った | \`pointermove\` では座標を記録するだけにし、\`requestAnimationFrame\` で CSS 変数（\`--sc-x\` / \`--sc-y\`）へ直接書く |
| 縮小表示（\`transform: scale\`）の中で光がずれる | \`clientX - rect.left\` の px をそのまま書いた | 単体カードは**矩形に対する %** で書く。グリッドは \`rect.width / offsetWidth\` で拡大率を割り戻す |
| SpotlightGrid に \`grid-cols-2\` などを付けても列数が変わらない | コンポーネントの CSS Modules はレイヤー外なので、\`@layer utilities\` の Tailwind より強い | 列定義は \`style={{ gridTemplateColumns: … }}\` で渡す |
| 枠線の光を mask で作り直したら Chrome / Safari で枠が出ない | \`mask\` と \`-webkit-mask\` を併記すると Next.js（Lightning CSS）がプレフィックスを整理してしまう | そもそも mask を使わない現行の構造（1px の padding + 不透明な面）を維持する |
| ホバーしていない初期表示が真っ暗 | 待機時の \`--sc-x: 30%\` / \`--sc-y: 20%\` と \`--sc-idle\` を消した | ルートクラスの既定値を残す。JS が動く前・タッチ端末でもこの状態で灯る |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。依存パッケージなし
- ファイル: \`components/spotlight-card/index.tsx\`（\`"use client"\`）+ \`SpotlightCard.module.css\`
- エクスポート: \`SpotlightCard\`（default も同じ）、\`SpotlightGrid\`
- \`SpotlightCard\` props: \`spotlightColor\`（既定 #c4b5fd）、\`borderColor\`（#26262b）、\`spotlightSize\`（420 px）、\`intensity\`（0–1、既定 1）、\`radius\`（18 px）、\`children\`、\`className\`、\`as\`（既定 "div"）、その他の HTML 属性（\`href\` 含む）はルート要素へそのまま渡す
- 既定値は CSS 変数（接頭辞 \`--sc-\`）でルートクラスに持ち、既定と異なる props だけ inline の style で上書きする

### 見た目
層構成は「枠線色 → 枠線の光 → 面 → 面の光 → グレイン → 中身」。mask は使わない。

- **ルート（.card）**: \`padding: 1px\`（これが枠線）、\`background: var(--sc-border)\`、\`border-radius: var(--sc-radius)\`、\`isolation: isolate\`、文字色 #ededef、システムフォント（-apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", Roboto…）
- **枠線の光（.card::before）**: \`inset: 0\`、\`radial-gradient(circle calc(var(--sc-size) * .3) at var(--sc-x) var(--sc-y), var(--sc-color), transparent 100%)\`。不透明な面に覆われ、外周 1px だけが光って見える
- **面（.surface）**: 不透明。\`linear-gradient(180deg, 白 3.5%, transparent 45%)\` + \`#0c0c0f\`、\`border-radius: calc(var(--sc-radius) - 1px)\`、\`overflow: hidden\`、\`inset 0 1px 0 白 4%\` の上辺ハイライト
- **面の光（.surface::before）**: \`radial-gradient(circle calc(var(--sc-size) * .5) at var(--sc-x) var(--sc-y), color-mix(in srgb, var(--sc-color) 16%, transparent), transparent 100%)\`
- **グレイン（.surface::after）**: SVG \`feTurbulence\`（fractalNoise, baseFrequency .9）のデータ URI、\`opacity: .05\`、\`mix-blend-mode: overlay\`。暗いグラデーションのバンディング防止
- **中身（.content）**: \`padding: var(--sc-padding)\`（24px）
- **明るさ**: 2 つの光の \`opacity\` は \`calc(var(--sc-level) * var(--sc-intensity))\`。\`--sc-level\` は待機時 \`--sc-idle\`（.45）、ポインター下と \`:focus-within\` で 1。\`opacity .4s ease\` でフェード
- **待機状態**: \`--sc-x: 30%; --sc-y: 20%\`（左上）。初回描画・JS 実行前・タッチ端末でも、この位置で控えめに灯る
- \`:focus-visible\`: \`2px solid color-mix(in srgb, var(--sc-color) 70%, white)\`、offset 3px

### SpotlightGrid
- \`display: grid\`、\`repeat(auto-fit, minmax(min(100%, 240px), 1fr))\`、\`gap: 12px\`、ul 用に margin / padding / list-style をリセット
- 子カードは Context でグリッド内と判定し、自前のポインター追跡をしない
- グリッドがポインター位置 \`--sc-gx\` / \`--sc-gy\`（グリッド内 px）を書き、各カードのオフセット \`--sc-ox\` / \`--sc-oy\` を ResizeObserver（グリッドと各カード）で計測して書く。準備完了で \`data-ready\` を付与し、\`.grid[data-ready] .card { --sc-x: calc(var(--sc-gx) - var(--sc-ox)) }\`（y も同様）。カードの外にある光も放射グラデーションなので、近い辺の枠線だけが光る
- グリッドの待機位置は中央（50% / 50%）。全カードの内側の角が控えめに光る。計測前は各カード自身の 30% / 20%
- ポインターがグリッド上にある間は全カードの枠線を level 1 に。面の光はホバー中のカードだけ 1、他は .35

### モーション
- \`pointermove\`（passive、\`addEventListener\` で登録し利用側のハンドラーを潰さない）では座標を記録して \`data-active\` を付けるだけ。CSS 変数の書き込みは \`requestAnimationFrame\` で 1 フレーム 1 回
- 単体カード: \`(clientX - rect.left) / rect.width * 100%\`。% なので親の \`transform: scale\` に影響されない
- グリッド: \`(clientX - rect.left) / (rect.width / offsetWidth)\` px
- \`pointerleave\`: \`data-active\` を外す。光はその場に残り、待機の明るさへフェード
- \`pointerType === "touch"\` は無視（タップで光が飛ばない）
- 常時アニメーションは無いので IntersectionObserver は不要
- \`prefers-reduced-motion: reduce\`: フェードの transition を無効化（追従自体は残す）

### アクセシビリティ
- 装飾の光とグレインはすべて疑似要素で、読み上げ対象にならない
- \`as\` で意味のある要素（article / li / a）を選べる。キーボードで中のリンクにフォーカスすると \`:focus-within\` でカードが点灯する

### 受け入れ条件
- ホバーなしの初回描画で、左上が控えめに光った状態で表示される
- マウス移動で枠線と面の光が追従し、React の再レンダーが発生しない
- SpotlightGrid 内では、カード間の隙間にポインターがあっても両隣の枠線が光る
- \`transform: scale(.4)\` の中でも光がポインター位置とずれない
- タッチ端末では待機状態のまま、レイアウトやスクロールに影響しない
`;
