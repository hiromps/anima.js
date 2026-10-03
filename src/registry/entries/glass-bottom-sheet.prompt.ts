/**
 * Prompt material for GlassBottomSheet (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same sheet from scratch.
 */

export const setup = `
1. シートを開くコンポーネント（\`"use client"\`）で \`const [open, setOpen] = useState(false)\` を持ち、\`<GlassBottomSheet open={open} onOpenChange={setOpen} title="…" />\` を置く。開くボタンの \`onClick\` で \`setOpen(true)\`。
2. \`app/layout.tsx\` で viewport に \`viewportFit: "cover"\` を指定する（GlassBottomTabBar を入れていれば設定済み）。これが無いと \`env(safe-area-inset-bottom)\` が 0 になり、iPhone のホームバーにシートの下端が重なる。
3. 既定（\`placement="fixed"\`）では \`<body>\` へポータルし、開いている間はページのスクロールを止める。親に \`transform\` や \`overflow: hidden\` があっても影響しない。
4. \`primaryAction\` / \`secondaryAction\` の \`onClick\` に処理をつなぐ。押すと処理のあと自動で閉じる。閉じたくない場合（送信中など）は \`keepOpen: true\`。
5. 本文は \`children\` に渡す。長い本文は本文エリアだけがスクロールし、ヘッダー（グラバー・タイトル）とボタンは固定される。
6. 「必ず選ばせたい」確認には \`dismissible={false}\`。下スワイプ・背景タップ・Escape が無効になり、× ボタンとアクションでのみ閉じる（× も消すなら \`showCloseButton={false}\`）。
7. GlassBottomTabBar と併用する場合、シートは \`z-index: 60\` でバー（50）より上に出る。追加の設定は不要。
8. \`npm run build\` が通ることを確認し、実機（iPhone）で「ホームバー領域と重ならない」「下スワイプで閉じる」「背後がぼけて透ける」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 本文をスクロールするとシートごと動く | ドラッグを本文でも拾っている | ドラッグはヘッダーの \`onPointerDown\` → \`dragControls.start()\` からだけ開始（\`dragListener={false}\`） |
| 閉じるアニメーションが出ずに消える | \`AnimatePresence\` の外で条件分岐している | \`open\` の分岐は \`AnimatePresence\` の内側で行う。コンポーネント自体は常にマウントしておく |
| SSR でハイドレーションエラー | サーバーで \`document.body\` にポータルしようとしている | 同梱の \`useSyncExternalStore\` によるクライアント判定を外さない |
| 視差効果オフでもスライドする | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-bottom-sheet/index.tsx\`（\`"use client"\`）+ \`GlassBottomSheet.module.css\`
- 制御コンポーネント: \`open\` / \`onOpenChange(open)\`、\`title\`（必須）、\`description\`、\`children\`、\`primaryAction\` / \`secondaryAction\`（\`{ label, onClick?, keepOpen? }\`）
- ルート: \`position: fixed; inset: 0; z-index: 60\`、\`display: flex; flex-direction: column; justify-content: flex-end\`。\`createPortal(…, document.body)\`、SSR 中は描画しない
- 開いている間 \`document.documentElement.style.overflow = "hidden"\`、閉じたら元に戻す

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「スクリム → 発光 → ガラス → レンズ（ボタン）」。硬い 1px の黒縁・濃い落ち影は使わない。

- **層 0 スクリム**: \`rgba(12,9,20,.45)\` + \`backdrop-filter: blur(4px)\`、opacity 0 → 1、250ms easeOut。タップで閉じる
- **フレーム（.frame）**: \`width: calc(100% - 20px)\`（左右 10px）・下 \`calc(10px + env(safe-area-inset-bottom))\` の浮遊配置、\`max-width: 480px\` で中央寄せ（ビューポートではなく親基準なのでモックアップ内でも余白が保たれる）、\`max-height: calc(100% - 56px)\`。framer-motion でスライドとドラッグを担当し、発光ごと動く
- **層 1 発光（.frame::before）**: \`inset: -24px -12px -28px\`、ピンク \`rgba(255,170,200,.45)\`（\`60% 55% at 20% 85%\`）とラベンダー \`rgba(190,175,255,.40)\`（\`55% 50% at 82% 15%\`）、下辺に \`rgba(255,200,220,.25)\`（\`70% 40% at 50% 100%\`）。\`filter: blur(26px)\`、\`z-index: -1\`
- **層 2 シート（.sheet）**: \`border-radius: 34px\`、\`overflow: hidden\`、\`isolation: isolate\`、縦 flex
  - background: \`linear-gradient(180deg, rgba(255,255,255,.19), rgba(255,255,255,.10))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 10px 40px rgba(255,170,205,.16)\` / \`0 24px 60px rgba(0,0,0,.36)\`
  - \`::before\` 上部の反射（白 .20 → .05 at 22% → 0 at 40%）、\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\`（60% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.96) → rgba(40,34,48,.96)\`
- **ヘッダー**: padding \`22px 18px 14px 22px\`。上中央にグラバー（38×5px、白 .38、top 8px）。タイトル 19px / 600、説明 13px / 行間 1.55 / 白 .66。右に × ボタン（32px 円、lucide \`X\` 18px、タブバーのアクティブピルと同じレンズ: 白 .12 → .05 + \`inset 0 1px 0 白 .5\` / \`inset 0 0 0 1px 白 .3\`）
- **本文**: \`flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain\`、15px / 行間 1.6 / 白 .86、padding \`2px 22px 8px\`
- **アクション**: 縦並び gap 10px、padding \`14px 16px 16px\`。高さ 50px のピル、17px / 500
  - メイン: \`#e5322d\`（タブバーの CTA と同じ赤）+ \`inset 0 1px 0 白 .28\` / \`0 8px 24px rgba(229,50,45,.32)\`
  - サブ: ガラスのレンズ（白 .10 → .04、\`inset 0 1px 0 白 .5\` / \`inset 0 0 0 1px 白 .34\` / \`0 4px 16px rgba(255,170,205,.16)\`）
  - 押下時 \`scale(.96)\` 120ms、\`:focus-visible\` は白 2px アウトライン
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- \`AnimatePresence\` で開閉。シートは \`y: "115%" → 0\`、スプリング \`stiffness: 380, damping: 34, mass: 0.9\`
- 下スワイプで閉じる: \`drag="y"\`、\`dragConstraints={{ top: 0, bottom: 0 }}\`、\`dragElastic={{ top: .04, bottom: .7 }}\`。\`offset.y > 110px\` または \`velocity.y > 600px/s\` で閉じ、未満はスプリングで戻る
- ドラッグはヘッダーからのみ開始（\`useDragControls\` + \`dragListener={false}\`、ヘッダーに \`touch-action: none\`）。× ボタンは \`pointerdown\` の伝播を止める
- \`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- \`role="dialog" aria-modal="true" aria-labelledby={title の id} aria-describedby={説明の id}\`、\`tabIndex={-1}\`
- 閉 → 開 の変化でシートにフォーカスし、閉じたら開く前のフォーカス要素に戻す（最初から open でマウントされた場合はフォーカスを動かさない）。Tab / Shift+Tab はシート内で循環
- Escape で閉じる（\`dismissible={false}\` では無効）。× は \`aria-label="閉じる"\`

### 受け入れ条件
- ボタンでシートがせり上がり、背景がぼけて暗くなる。シート越しに背後の色がガラスに乗る
- 下スワイプ・背景タップ・Escape・× で閉じ、閉じるアニメーションが出る
- 長い本文は本文だけスクロールし、ページはスクロールしない
- iPhone のホームバー領域と重ならない
`;
