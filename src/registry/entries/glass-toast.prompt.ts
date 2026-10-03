/**
 * Prompt material for GlassToast (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same toast from scratch.
 */

export const setup = `
1. 通知を出すコンポーネント（\`"use client"\`）で \`const [open, setOpen] = useState(false)\` を持ち、\`<GlassToast open={open} onOpenChange={setOpen} title="…" variant="success" />\` を置く。保存完了などのタイミングで \`setOpen(true)\`。
2. \`app/layout.tsx\` で viewport に \`viewportFit: "cover"\` を指定する（GlassBottomTabBar を入れていれば設定済み）。これが無いと \`env(safe-area-inset-top)\` が 0 になり、iPhone のノッチ / Dynamic Island に通知が重なる。
3. 既定（\`placement="fixed"\`）では \`<body>\` へポータルし、画面上端の中央に出る。親に \`transform\` や \`overflow: hidden\` があっても影響しない。フォーカスは奪わない。
4. \`duration\`（ms、既定 4000）で自動的に閉じる。\`0\` にすると × か上スワイプで閉じるまで表示し続ける。ホバー・押下・フォーカス中はカウントが止まり、離れると残り時間から再開する。
5. \`action={{ label: "元に戻す", onClick }}\` で小さなガラスのボタンを出せる。押すと \`onClick\` のあと自動で閉じる。
6. 同じ通知をもう一度出したいとき、表示中なら一度 \`setOpen(false)\` してから出す（または \`key\` を変えて再マウントする）。
7. GlassBottomSheet / GlassBottomTabBar と併用する場合、通知は \`z-index: 70\` で両方より上に出る。追加の設定は不要。
8. \`npm run build\` が通ることを確認し、実機（iPhone）で「Dynamic Island の下に出る」「上スワイプで閉じる」「背後がぼけて透ける」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| スクリーンリーダーが読み上げない | ライブリージョンごと条件付きで描画している | \`role="status"\` / \`aria-live\` を持つ外側のラッパーは常にマウントし、中身だけを \`AnimatePresence\` で出し入れする |
| 閉じるアニメーションが出ずに消える | \`AnimatePresence\` の外で条件分岐している | \`open\` の分岐は \`AnimatePresence\` の内側で行う。コンポーネント自体は常にマウントしておく |
| 通知の左右の空白をタップできない | 横幅いっぱいのラッパーがタップを拾っている | ラッパーは \`pointer-events: none\`、カプセル（.frame）だけ \`pointer-events: auto\` |
| SSR でハイドレーションエラー | サーバーで \`document.body\` にポータルしようとしている | 同梱の \`useSyncExternalStore\` によるクライアント判定を外さない |
| 視差効果オフでも降りてくる | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない（フェードだけ残る） |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-toast/index.tsx\`（\`"use client"\`）+ \`GlassToast.module.css\`
- 制御コンポーネント: \`open\` / \`onOpenChange(open)\`、\`title\`（必須）、\`description\`、\`variant\`（\`"success" | "info" | "warning" | "error"\`、既定 \`"info"\`）、\`duration\`（ms、既定 4000、0 = 自動で閉じない）、\`action\`（\`{ label, onClick? }\`）、\`showCloseButton\`（既定 true）、\`glowColorA\` / \`glowColorB\` / \`blur\`、\`springStiffness\` / \`springDamping\`、\`placement\`（\`"fixed" | "absolute"\`）
- ルート: \`position: fixed; top: calc(10px + env(safe-area-inset-top)); left: 0; right: 0; z-index: 70\`、\`display: flex; justify-content: center; pointer-events: none\`。\`createPortal(…, document.body)\`、SSR 中は描画しない。\`placement="absolute"\` では \`position: absolute\`（モックアップ用）

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム（Dynamic Island 風カプセル）
層構成は「発光 → ガラス → レンズ（アイコン / ボタン）→ 文字」。硬い 1px の黒縁・濃い落ち影は使わない。

- **フレーム（.frame）**: \`width: max-content\`、\`min-width: min(240px, 100% - 20px)\`、\`max-width: min(440px, 100% - 20px)\`（親基準なのでモックアップ内でも左右 10px が保たれる）。\`pointer-events: auto; touch-action: none; cursor: grab\`。framer-motion で降下とドラッグを担当し、発光ごと動く
- **層 1 発光（.frame::before）**: \`inset: -16px -14px -22px\`、ピンク \`rgba(255,170,200,.45)\`（\`60% 70% at 18% 70%\`）とラベンダー \`rgba(190,175,255,.40)\`（\`55% 65% at 84% 30%\`）、下辺に \`rgba(255,200,220,.25)\`（\`70% 45% at 50% 100%\`）。\`filter: blur(22px)\`、\`z-index: -1\`
- **層 2 カプセル（.toast）**: \`border-radius: 28px\`、\`min-height: 56px\`、padding \`8px 10px 8px 8px\`、横 flex・gap 12px・\`align-items: center\`、\`overflow: hidden\`、\`isolation: isolate\`
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`
  - \`::before\` 上部の反射（白 .22 → .06 at 35% → 0 at 60%）、\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\`（50% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **アイコン（.icon）**: 40px の円いレンズ。白 .12 → .05 + \`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\` + \`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\`。lucide のアイコン 20px（success \`CheckCircle2\` / info \`Info\` / warning \`AlertTriangle\` / error \`XCircle\`）
  - 種類ごとの色（\`--gts-tone\`）: success \`#8ef0b6\`、info \`#a9c8ff\`、warning \`#ffd98a\`、error \`#ff9a96\`。アイコン色・レンズ内側のほのかな光（22%）・外光 \`0 4px 16px\`（22%）・アイコンの \`drop-shadow(0 0 6px)\`（55%）にだけ使い、ガラスやピンク / ラベンダーの発光は変えない
- **文字**: タイトル 15px / 600 / 行間 1.35、説明 12.5px / 行間 1.5 / 白 .64
- **アクションボタン**: 高さ 32px のピル、padding \`0 14px\`、13px / 600、レンズ（白 .12 → .05、\`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`）
- **× ボタン**: 28px の円、同じレンズ、lucide \`X\` 15px、白 .8
- 押下時 \`scale(.94)\` 120ms、\`:focus-visible\` は白 2px アウトライン
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- \`AnimatePresence\` で開閉。\`{ y: "-120%", scale: .9, opacity: 0 } → { y: 0, scale: 1, opacity: 1 }\`、スプリング \`stiffness: 380, damping: 30, mass: 0.9\`（opacity だけ 180ms easeOut）。閉じるときは逆
- 上スワイプで閉じる: カプセルのどこからでも \`drag="y"\`、\`dragConstraints={{ top: 0, bottom: 0 }}\`、\`dragElastic={{ top: .8, bottom: .08 }}\`。\`offset.y < -36px\` または \`velocity.y < -450px/s\` で閉じ、未満はスプリングで戻る
- 自動クローズ: 表示ごとに残り時間をリセットし、ホバー（マウス）・押下（\`pointerup\` は window で拾う）・フォーカス中は停止、再開時は残り時間から。退場アニメ中（\`useIsPresent()\` が false）はタイマーを動かさない
- \`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- 常にマウントしている外側のラッパーに \`role="status" aria-live="polite" aria-atomic="true"\`（\`variant="error"\` のときは \`role="alert" aria-live="assertive"\`）
- フォーカスは移動しない。Tab で通知内のボタンに入った間はカウントが止まる（WCAG 2.2.1）。フォーカスが通知内にあるとき Escape で閉じる
- × は \`aria-label="通知を閉じる"\`、アイコンは \`aria-hidden\`

### 受け入れ条件
- \`setOpen(true)\` で上からカプセルが降り、背後の色がガラスに乗ってぼける
- \`duration\` 経過で自動で閉じ、ホバー中は閉じない。\`duration={0}\` では閉じない
- 上スワイプ・×・アクション・Escape で閉じ、閉じるアニメーションが出る
- スクリーンリーダーがタイトルと説明を読み上げる（エラーは割り込みで）
- iPhone のノッチ / Dynamic Island と重ならない
`;
