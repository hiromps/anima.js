/**
 * Prompt material for MagnifyDock (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same dock from scratch.
 */

export const setup = `
1. ドックを置くコンポーネントを \`"use client"\` にして \`<MagnifyDock items={[…]} />\` を描画する。\`icon\`（lucide-react のコンポーネント）や \`onClick\` は関数なので、Server Component から props として渡すことはできない。
2. 画面下に固定するなら、ラッパーで配置する: \`<div style={{ position: "fixed", insetInline: 0, bottom: 16, zIndex: 40 }}><MagnifyDock … /></div>\`。ルートは \`display: flex; justify-content: center\` なので、幅いっぱいのラッパーに入れれば中央に来る。
3. 各アイテムに \`href\`（\`<a>\` になる）か \`onClick\`（\`<button>\` になる）を渡す。\`href\` は素の \`<a>\` なのでフルページ遷移になる。クライアント遷移が必要なら \`onClick\` で \`router.push()\` を呼ぶ。
4. 区切り線は \`{ type: "separator", id: "sep" }\` を items に入れる。\`id\` は React の key に使うので一意にする。
5. \`active: true\` のアイテムには下にドットが出て、\`aria-current="true"\` が付く。現在のページ / 起動中の状態に合わせて付け替える。
6. 拡大したタイルとラベルはバーの**上にはみ出す**。ドックの上に \`magnification + 40px\` 程度の空きを確保する。
7. \`npm run build\` が通ることを確認し、「ポインタで波のように拡大する」「Tab でフォーカスしたタイルも拡大しラベルが出る」「スマホではタップで縮むだけ」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 拡大したタイルやラベルの上が切れる | 祖先要素に \`overflow: hidden\` がある | ドックの祖先では \`overflow: visible\` にするか、上に十分な余白を取る |
| 拡大すると左右に偏って伸びる | 固定幅の親の中で左寄せになっている | ドックを幅いっぱいのラッパーに入れ、ルートの \`justify-content: center\` を崩さない |
| Chrome でバーのぼかしが効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| Server Component から渡すとエラー | \`icon\` / \`onClick\` は関数でシリアライズできない | items を組み立てるコンポーネントを \`"use client"\` にする |
| タイルごとの \`useTransform\` / \`useSpring\` でフックのエラー | フックを \`items.map\` の中で直接呼んでいる | タイルは子コンポーネント（\`DockTile\`）に分け、フックはその中で呼ぶ |
| マウス移動でカクつく / 再レンダーが多い | ポインタ座標を \`useState\` に入れている | 座標は \`useMotionValue\` に \`set\` するだけにする（React の再レンダーを起こさない） |
| 視差効果オフでも拡大する | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`useReducedMotion()\` が true のときはポインタ座標を更新しない。\`<MotionConfig reducedMotion="user">\` も外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`（アイコン）
- ファイル: \`components/magnify-dock/MagnifyDock.tsx\`（\`"use client"\`）+ \`MagnifyDock.module.css\` + \`index.ts\`
- props: \`items\`（\`{ id, label, icon: LucideIcon, href?, onClick?, active?, gradient? }\` または \`{ type: "separator", id }\`）、\`baseSize\`（52）、\`magnification\`（84）、\`distance\`（150）、\`gap\`（10）、\`showLabels\`（\`"hover" | "always" | "never"\`、既定 hover）、\`showIndicators\`（true）、\`springStiffness\`（260）/ \`springDamping\`（20）/ \`springMass\`（0.3）、\`tileStyle\`（\`"glass-dark" | "colorful"\`）、\`className\`、\`aria-label\`（既定「ドック」）
- 横向きのみ

### 見た目
- ルート \`<nav>\`: \`display: flex; justify-content: center\`。フォント \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif\`
- バー \`<ul>\`: \`display: flex; align-items: flex-end; gap\`、高さは \`baseSize + 20px\` に固定（padding 10px）。タイルは下揃えで、拡大分はバーの**上にはみ出す**（バー自体は縦に動かない）
  - 角丸 \`baseSize × .36 + 10px\`
  - background: \`linear-gradient(180deg, 白 .10, 白 .03)\` + \`rgba(18,18,24,.42)\`、\`backdrop-filter: blur(24px) saturate(180%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .20\` / \`inset 0 0 0 1px 白 .08\` / \`0 2px 8px 黒 .3\` / \`0 24px 60px 黒 .5\`
  - \`::before\` に feTurbulence の SVG ノイズ（opacity .07、overlay）でフィルムグレイン
- タイル: 角丸 24% の正方形、アイコンは 48% サイズ・線幅 1.75
  - glass-dark: \`linear-gradient(180deg, 白 .16, 白 .05)\`、\`inset 0 1px 0 白 .28\` / \`inset 0 0 0 1px 白 .08\` / \`0 6px 16px 黒 .35\`、アイコン白 .92
  - colorful: アイテム順にアプリアイコン風のグラデーション（シアン→青、ラベンダー→紫、オレンジ、ピンク→赤、グレー、緑…）。\`gradient\` で個別指定可
  - 共通: 上半分にスペキュラーの光沢（白 .22 → .04 at 45% → 0 at 55%）
- ラベル（hover）: タイル上 12px にダークのすりガラス吹き出し（\`rgba(30,30,36,.82)\`、blur 12px、12px / 500、角丸 8px、下向きのキャレット）
- ラベル（always）: 吹き出しなしの 11px キャプション（白 .78 + text-shadow）
- インジケーター: active のタイル下、バーの下 padding 内に 4px の白ドット（グロー付き）
- 区切り線: 幅 1px・高さ \`baseSize × .78\`、上下がフェードする白 .26 のライン

### モーション
- ポインタ X を \`useMotionValue\`（初期値・離脱時 \`Infinity\`）に保持。\`<ul>\` の \`pointermove\` で \`clientX\` を \`set\`（\`pointerType === "touch"\` は無視）、\`pointerleave\` で \`Infinity\`
- タイルごと: \`useTransform(mouseX, x => …)\` でタイル中心（\`getBoundingClientRect\`）との距離 d を出し、\`d < distance\` なら余弦カーブ \`(1 + cos(π·d/distance)) / 2\` で \`baseSize → magnification\` を補間。\`useSpring\`（stiffness 260 / damping 20 / mass 0.3）を通して \`<li>\` の width / height に適用（隣のタイルが押し広げられる）
- キーボード: \`:focus-visible\` のフォーカスでそのタイル中心を mouseX に入れて拡大。ドック外にフォーカスが出たら \`Infinity\`
- ラベル: CSS のみ。opacity 0 → 1（140ms）、\`translateY(6px) scale(.9) → 0 / 1\`（260ms、\`cubic-bezier(.34,1.56,.64,1)\` で軽くオーバーシュート）。\`:hover\` は \`@media (hover: hover)\` の中だけ
- タップ: \`:active\` で内側のタイルを \`scale(.9)\`（160ms）。タッチでは拡大しない
- \`prefers-reduced-motion\`: 拡大しない（mouseX を更新しない）、ラベルはフェードのみ、\`<MotionConfig reducedMotion="user">\`

### アクセシビリティ
- \`<nav aria-label>\` → \`<ul>\` → \`<li>\`。各アイテムは \`href\` があれば \`<a>\`、なければ \`<button type="button">\`。\`aria-label={label}\`、吹き出しとアイコンは \`aria-hidden\`
- \`active\` は \`aria-current="true"\`
- 区切り線は \`aria-hidden\`（リンク数だけが読み上げられる）
- \`:focus-visible\` で白 2px アウトライン（offset 3px）

### 受け入れ条件
- ポインタを横に動かすと、近いタイルほど大きくなる波がなめらかに追従し、離れると元のサイズへ戻る
- 拡大中もバーの高さと下端は動かず、タイルとラベルが上にはみ出す
- Tab で移動するとフォーカス中のタイルが拡大し、ラベルが出る
- タッチ端末では拡大せず、タップで縮むフィードバックだけが出る
- 視差効果を減らす設定ではすべて基本サイズのまま
`;
