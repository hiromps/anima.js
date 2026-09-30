/**
 * Prompt material for GlassBottomTabBar (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add` — the bar
 * needs body padding, a layout slot and viewport-fit that the registry
 * can't install for them. `spec` is the full visual spec, so an assistant
 * that can't reach the registry can rebuild the same bar from scratch.
 */

export const setup = `
1. \`app/layout.tsx\` の \`<body>\` 内、\`{children}\` の直後に \`<GlassBottomTabBar />\` を 1 つだけ置く。ページごとには置かない。
2. \`app/layout.tsx\` で viewport に \`viewportFit: "cover"\` を指定する。これが無いと \`env(safe-area-inset-bottom)\` が 0 になり、iPhone のホームバーとバーが重なる。
   \`\`\`tsx
   import type { Viewport } from "next";
   export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
   \`\`\`
3. \`app/globals.css\` に、バーが出ているページだけ本文の下端を空けるルールを追記する（バーは \`hiddenPaths\` と 768px 以上では出ないので、padding も同じ条件で付け外しされる）。
   \`\`\`css
   @media (max-width: 767px) {
     body:has([data-bottom-tab-bar]) {
       padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
     }
   }
   \`\`\`
4. \`tabs\` にプロジェクトのタブ（\`href\` / \`label\` / lucide-react のアイコン）を渡す。\`href\` は**実在するルート**に向けること。404 のリンクは Next.js がフルリロードにするため、バーごと再マウントされてピルのスプリング移動が起きない。ラベルは 11px / 改行なしなので 4 文字前後が目安。長い場合はタブ数を減らす。
5. \`hiddenPaths\`（既定 \`["/"]\`、完全一致）で、バーを出さないパスを指定する。トップページにも出したい場合は \`hiddenPaths={[]}\`。
6. 全画面メニューがあるサイトでは、開いたときに \`<header data-open>\` が付くようにするとバーが自動で下へ退く。無ければ何もしなくてよい（CSS の \`body:has(header[data-open])\` ブロックは削除しても構わない）。
7. \`npm run build\` が通ることを確認し、実機（iPhone）で「ホームバー領域と重ならない」「スクロール時にバー越しにコンテンツがぼけて透ける」を確認する。

### 触ってはいけないところ（実際に踏んだハマりどころ）
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が \`-webkit-\` だけ残して unprefixed を削る。Chrome は \`-webkit-\` を解釈しない | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| タブを押してもピルがスライドしない | リンク先が 404 だと Next.js がフルリロードにし、バーごと再マウントされる | 実在するルートに向ける |
| アクティブアイコンが白い塊になる | lucide は細部パスを先に・外形を最後に描く。外形を \`fill\` すると細部が下に隠れる | 同梱の SVG マスク方式（シルエットから細部をくり抜く）をそのまま使う |
| アイコンの周りに黒い輪郭が出る | マスクの細部層で外形パスまで黒（= 隠す）にしている | \`.maskDetail path:last-child { stroke: #fff }\` を消さない |
| 視差効果オフで動きが止まらない | グローバルの reduced-motion は CSS だけに効き、framer-motion は JS で動く | 同梱の \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-bottom-tab-bar/index.tsx\`（\`"use client"\`）+ \`GlassBottomTabBar.module.css\`
- モバイル幅（< 768px）のみ表示。\`hiddenPaths\`（既定 \`["/"]\`、完全一致）では \`null\` を返す
- \`position: fixed; left/right: 14px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 50\`
- 本文がバーに隠れないよう、globals.css で \`@media (max-width: 767px) { body:has([data-bottom-tab-bar]) { padding-bottom: calc(96px + env(safe-area-inset-bottom)) } }\`。ルート要素に \`data-bottom-tab-bar\` を付ける
- viewport は \`viewportFit: "cover"\` にして \`env()\` を有効にする

### 見た目 = グラスモーフィズム（ダーク地の上に白系のすりガラス + パステルの発光）
層構成は「発光 → ガラス → レンズ（ピル） → アイコン」の 4 層。硬い 1px の黒縁・濃い落ち影・鋭い角は使わない。

- **層 0 発光（root::before）**: バーの背後（\`inset: -18px -10px -26px\`）に、ピンク \`rgba(255,170,200,.45)\` とラベンダー \`rgba(190,175,255,.40)\` の radial-gradient を左右にずらして重ね（\`55% 80% at 22% 70%\` / \`50% 80% at 78% 30%\`）、さらに下辺中央に \`rgba(255,200,220,.25)\`（\`70% 60% at 50% 100%\`）。\`filter: blur(22px)\`、\`z-index: -1\`
- **層 1 バー本体（.bar）**: 高さ 62px、\`border-radius: 9999px\`、padding 5px、\`overflow: hidden\`、\`isolation: isolate\`、\`display: grid; grid-template-columns: repeat(タブ数, 1fr)\`
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\` ※ \`-webkit-backdrop-filter\` は書かない（ビルド時に自動付与。併記すると unprefixed が消える）
  - box-shadow: \`inset 0 1px 0 rgba(255,255,255,.45)\` / \`inset 0 0 0 1px rgba(255,255,255,.20)\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`（リムは border ではなく inset の白で描く）
  - \`::before\` 上半分の反射（白 .22 → .06 at 40% → 0 at 58%）、\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\` を溜める（50% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では不透明度 .94 の暗い地色（\`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`）に落とす
- **層 2 アクティブピル（.pill）**: セルいっぱい（\`position: absolute; inset: 0\`、52px）、白く塗らず「枠だけのガラス」
  - background: 白 .08 → .03 のグラデ、\`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\`
  - box-shadow: \`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`
  - \`::before\` で上辺にだけ細い反射（\`radial-gradient(60% 40% at 50% 0%, 白 .14, transparent 70%)\`）
  - framer-motion の \`layoutId\` でタブ間をスプリング移動（\`type: "spring", stiffness: 380, damping: 30, mass: 0.9\`）。\`will-change: transform\`、\`pointer-events: none\`
- **層 3 アイコン（24px、lucide-react、strokeWidth 1.6）**
  - 非アクティブ: 線画、色 \`rgba(255,255,255,.62)\`
  - アクティブ: 白いシルエットから細部の線（持ち手・綴じ目・扉）を SVG \`<mask>\` で「くり抜く」。マスク内に同じアイコンを 2 枚重ね、1 枚目は \`fill="#fff" stroke="#fff"\`（シルエット = 見せる）、2 枚目は \`fill="none"\` で \`stroke: #000\`（細部 = 隠す）。くり抜いた部分にはバーのガラス背景がそのまま透ける（黒は使わない）。\`<rect fill="currentColor" mask="url(#id)">\` で塗る
  - lucide は細部パスを先に・外形パスを最後に描くので、マスクの細部層では \`path:last-child\` だけ白（= 見せる）にして外周に溝を作らない
  - マスクの id は \`useId()\` + href から生成し、\`url(#...)\` で扱えない記号は落とす
  - アクティブ時は \`filter: drop-shadow(0 0 8px rgba(255,200,225,.55))\` の柔らかい発光。線画/くり抜きの切替は opacity 200ms
- ラベル 11px / 500 / システムフォント（\`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`）、\`white-space: nowrap\`。アクティブは白 + \`text-shadow: 0 0 10px rgba(255,200,225,.5)\`
- 押下時 \`transform: scale(.94)\` 120ms、色の切替 200ms、\`-webkit-tap-highlight-color: transparent\`、\`touch-action: manipulation\`
- \`aria-current="page"\` を付ける。\`role="tab"\` は付けない（リンクの意味が壊れる）。\`<nav aria-label="メインナビゲーション">\`
- \`<MotionConfig reducedMotion="user">\` で包み、OS の視差効果オフに従う
- 任意: \`cta={{ label, href }}\` を渡すとバー直下に赤い帯（高さ 44px、\`#e5322d\`、17px / 500、\`border-radius: 9999px\`、\`margin-top: 8px\`）が \`AnimatePresence\` で高さ 0 → 44px、200ms easeOut でスライドインする
- 任意: \`body:has(header[data-open]) .root\` で \`translateY(calc(100% + 24px))\` + opacity 0 にして、全画面メニュー中は下へ退く（0.4s \`cubic-bezier(0.22, 1, 0.36, 1)\`）

### アクティブ判定
- \`usePathname()\` と各タブの \`href\` を比較。\`"/"\` は全パスに前方一致してしまうので完全一致のみ、それ以外は \`pathname === href || pathname.startsWith(href + "/")\`

### 受け入れ条件
- \`hiddenPaths\` で非表示、他ページで表示。デスクトップ（768px 以上）で非表示
- タブ切替でピルがスプリング移動し、アイコンが線画 → くり抜きシルエットに変わる
- スクロール時にバー越しにコンテンツがぼけて透け、背後の色がガラスに乗る
- iPhone のホームバー領域と重ならない
`;
