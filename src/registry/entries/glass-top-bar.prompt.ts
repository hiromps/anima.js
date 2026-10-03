/**
 * Prompt material for GlassTopBar (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same bar from scratch.
 */

export const setup = `
1. ページのコンポーネント（\`"use client"\`）に \`<GlassTopBar title="…" leading={{ icon: ChevronLeft, label: "戻る", onClick: () => router.back() }} />\` を置く。右のボタンは \`trailing\`（最大 2 つ、3 つ目以降は描画されない）。アイコンは \`lucide-react\` から選び、\`label\` は必ず意味のある日本語にする（アイコンだけのボタンの読み上げ名になる）。
2. \`app/layout.tsx\` で viewport に \`viewportFit: "cover"\` を指定する（GlassBottomTabBar を入れていれば設定済み）。これが無いと \`env(safe-area-inset-top)\` が 0 になり、iPhone のノッチ / Dynamic Island にバーが重なる。
3. 既定（\`placement="fixed"\`）ではバーが本文の上に浮くので、本文側に \`padding-top: calc(72px + env(safe-area-inset-top))\` 程度を確保する。iOS 風にするなら本文の先頭に大きな見出し（28〜34px / 700）を置くと、スクロールで見出しがバーの下に潜り、バーのガラスが現れる流れになる。
4. ページが \`window\` ではなくコンテナ（\`overflow-y: auto\` の要素）の中でスクロールする場合は、その要素の ref を \`scrollContainerRef\` に渡す。
5. 透明 → ガラスに切り替わる距離は \`revealDistance\`（既定 60px）。読む画面で上部を広く使いたい場合は \`hideOnScroll\` を付ける（下スクロールで退避、上スクロールで復帰）。
6. ステータスバー付きのモックアップなどで上端位置を変えたい場合は、CSS 変数 \`--gtb-top\` を \`className\`（例: Tailwind の \`[--gtb-top:48px]\`）で渡す。
7. \`npm run build\` が通ることを確認し、実機（iPhone）で「最上部では透明」「スクロールでガラスと発光が現れる」「ノッチと重ならない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| スクロールしてもガラスが現れない | \`scrollContainerRef\` が実際にスクロールしている要素を指していない（または window がスクロールしていない） | \`overflow-y: auto\` を持つ要素の ref を渡す。window でスクロールするページでは渡さない |
| \`--gtb-top\` を Tailwind で渡しても効かない | \`.root\` に既定値を宣言すると、レイヤー外の CSS Modules が \`@layer utilities\` に常に勝つ | \`.root\` では \`top: var(--gtb-top, calc(10px + env(safe-area-inset-top)))\` と参照だけにし、宣言しない |
| ガラスのフェードでぼかしが消える / ちらつく | 親（ヘッダー）の \`opacity\` やフィルタで backdrop root ができ、背後が見えなくなる | スクロール連動の不透明度はガラス層（\`.glass\`）と発光層だけにかける。ヘッダー自体は隠すときだけフェードする |
| マウント直後にバーが隠れる | 復元されたスクロール位置へのジャンプを「下スクロール」と判定している | 最初のスクロールイベントは基準値の記録だけにする（同梱の実装どおり） |
| 視差効果オフでもスライドする | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-top-bar/index.tsx\`（\`"use client"\`）+ \`GlassTopBar.module.css\`
- props: \`title\`（必須）、\`subtitle\`（空文字は非表示）、\`leading\` / \`trailing[]\`（\`{ icon: LucideIcon, label, onClick }\`、trailing は先頭 2 つだけ描画）、\`scrollContainerRef?: RefObject<HTMLElement | null>\`、\`revealDistance\`（既定 60）、\`hideOnScroll\`（既定 false）、\`placement: "fixed" | "absolute"\`、\`glowColorA\` / \`glowColorB\`、\`blur\`、\`springStiffness\` / \`springDamping\`、\`className\`
- ルート: \`<header>\`、\`position: fixed; left: 14px; right: 14px; top: var(--gtb-top, calc(10px + env(safe-area-inset-top)))\`、\`z-index: 50\`（GlassBottomSheet の 60 より下）、\`isolation: isolate\`。\`placement="absolute"\` では \`position: absolute\`

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「発光 → ガラス → レンズ（ボタン）→ アイコン」。硬い 1px の黒縁・濃い落ち影は使わない。

- **レイアウト**: 高さ 52px、\`border-radius: 9999px\`、padding \`0 6px\`、\`grid-template-columns: var(--gtb-side) minmax(0, 1fr) var(--gtb-side)\`。\`--gtb-side\` は左右で多い方のボタン数から算出（\`n × 40px + (n − 1) × 6px\`）してインラインで渡す → タイトルは常にバー中央、長いタイトルはボタンではなくタイトル列が縮んで省略される、gap 8px
- **層 0 発光（.glow、要素）**: \`inset: -22px -10px -18px\`、ピンク \`color-mix(#ffaac8 45%)\`（\`55% 80% at 22% 70%\`）とラベンダー \`#beafff 40%\`（\`50% 80% at 78% 30%\`）、下辺に \`#ffc8dc 25%\`（\`70% 60% at 50% 100%\`）。\`filter: blur(22px)\`。不透明度をスクロールに連動させるため疑似要素ではなく要素にする
- **層 1 ガラス（.glass、\`inset: 0\`）**:
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`
  - \`::before\` 上半分の反射（白 .22 → .06 at 40% → 0 at 58%）、\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\`（50% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **層 2 レンズボタン**: 40px 円、lucide アイコン 20px / strokeWidth 1.8。白 .12 → .05、\`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\`、\`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`。**スクロール位置に関係なく常に表示**（最上部ではレンズだけがバーの位置を示す）
- **タイトル**: 17px / 600、白、1 行で省略（\`text-overflow: ellipsis\`）。サブタイトル 12px / 500 / 白 .64
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- \`useScroll({ container: scrollContainerRef })\`（未指定なら window）の \`scrollY\` から \`reveal = useTransform(scrollY, [0, revealDistance], [0, 1])\`
- 発光とガラスの \`opacity\` を \`reveal\` に連動（ガラスの不透明度ごとぼかしもフェードする）。タイトルは \`scale\` 1.08 → 1 で「最上部では大きめ」の感触を出す
- \`hideOnScroll\`: \`useMotionValueEvent(scrollY, "change")\` で前回値との差分を見る。差が 4px 未満は無視、下方向かつ \`scrollY > revealDistance\` で隠し、上方向で戻す。最初のイベントは基準値の記録だけ
- 隠すときはヘッダーを \`y: "-150%", opacity: 0\`、スプリング \`stiffness: 380, damping: 32, mass: 0.9\`。隠れている間は \`pointer-events: none\`
- \`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- ルートは \`<header>\`。ボタンは \`<button type="button" aria-label={label}>\`、アイコンは \`aria-hidden\`
- \`:focus-visible\` は白 2px アウトライン（offset 2px）。\`touch-action: manipulation\`、\`-webkit-tap-highlight-color: transparent\`、押下時 \`scale(.92)\`
- 隠れている間に Tab でボタンへフォーカスが入ったらバーを戻す（\`onFocusCapture\`）。見えないボタンにフォーカスが乗らない

### 受け入れ条件
- ページ最上部ではバーが透明でレンズボタンとタイトルだけが見え、スクロールに合わせてガラスと発光が現れる
- ガラス越しに背後の色がぼけて乗る。Chrome / Safari の両方でぼかしが効く
- \`hideOnScroll\` で下スクロール時に隠れ、上スクロールで戻る。マウント直後に勝手に隠れない
- タイトルが長くても 1 行で省略され、左右のボタンと重ならない
- iPhone のノッチ / Dynamic Island と重ならない
`;
