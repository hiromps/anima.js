/**
 * Prompt material for GlassFabMenu (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same menu from scratch.
 */

export const setup = `
1. FAB を出したいページ（またはレイアウト）の \`"use client"\` コンポーネントに \`<GlassFabMenu actions={[…]} />\` を置く。各アクションは \`{ id, label, icon, onSelect }\`（\`icon\` は lucide-react のアイコン）。選ぶと \`onSelect\` のあと自動で閉じる。
2. \`app/layout.tsx\` で viewport に \`viewportFit: "cover"\` を指定する（GlassBottomTabBar を入れていれば設定済み）。これが無いと \`env(safe-area-inset-*)\` が 0 になり、iPhone のホームバーや角丸に FAB が寄りすぎる。
3. 既定（\`placement="fixed"\`）では \`<body>\` へポータルし、画面の右下（\`position\` で左下・下中央も可）に固定される。親に \`transform\` や \`overflow: hidden\` があっても影響しない。
4. 開閉状態を外から持ちたい場合は \`open\` / \`onOpenChange\` を渡す（渡さなければ内部で管理。初期状態は \`defaultOpen\`）。
5. GlassBottomTabBar と併用する場合、FAB は \`z-index: 55\`（バー 50 より上、GlassBottomSheet 60 より下）。位置はバーと重なるので、\`className\` か \`[data-glass-fab-menu]\` に \`--gfm-inset-bottom: 104px\` を指定してバーの上に持ち上げる（\`--gfm-inset-bottom\` は CSS 側で未宣言なので詳細度を気にせず効く）。
6. 主要な作成アクションなら \`accent="red"\`（タブバーの CTA と同じ #e5322d）。項目が多い・ラベルが長い場合は \`layout="stack"\`、3〜5 個の短いラベルなら \`layout="radial"\` も選べる。
7. \`npm run build\` が通ることを確認し、実機（iPhone）で「ホームバー領域と重ならない」「背景タップで閉じる」「閉じている間は FAB 以外のページ操作を邪魔しない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 閉じているのにページがタップできない | 全面を覆うルートが pointer イベントを拾っている | ルートは \`pointer-events: none\`、スクリムと FAB だけ \`auto\`。外さない |
| 展開中にアクションのぼかしが消えて急に出る | メニューのコンテナ（親）で \`opacity\` をアニメーションしている | フェードは各アクション要素に付ける。親に \`opacity\` / \`filter\` を掛けると子の \`backdrop-filter\` が無効になる |
| 閉じるアニメーションが出ずに消える | \`AnimatePresence\` の外で条件分岐している | \`open\` の分岐は \`AnimatePresence\` の内側で行う。コンポーネント自体は常にマウントしておく |
| SSR でハイドレーションエラー | サーバーで \`document.body\` にポータルしようとしている | 同梱の \`useSyncExternalStore\` によるクライアント判定を外さない |
| 視差効果オフでも飛び出す | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-fab-menu/index.tsx\`（\`"use client"\`）+ \`GlassFabMenu.module.css\`
- Props: \`actions\`（\`{ id, label, icon: LucideIcon, onSelect? }[]\`）、\`open\` / \`defaultOpen\` / \`onOpenChange\`（制御・非制御どちらも可）、\`layout\`（\`"stack" | "radial"\`）、\`accent\`（\`"glass" | "red"\`）、\`position\`（\`"bottom-right" | "bottom-left" | "bottom-center"\`）、\`placement\`（\`"fixed" | "absolute"\`）、\`glowColorA\` / \`glowColorB\` / \`blur\`、\`springStiffness\` / \`springDamping\`、\`aria-label\`（既定「アクションメニュー」）
- ルート: \`position: fixed; inset: 0; z-index: 55; pointer-events: none\`。\`fixed\` では \`createPortal(…, document.body)\`、SSR 中は描画しない。\`absolute\` は最寄りの positioned 祖先を埋めてその場に描画（モックアップ用）
- FAB の位置: 60px の箱を \`right: calc(20px + env(safe-area-inset-right))\` / \`bottom: calc(var(--gfm-inset-bottom, 20px) + env(safe-area-inset-bottom))\`。左下は left、下中央は \`left: calc(50% - 30px)\`

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「スクリム → 発光 → ガラス → レンズ → アイコン」。硬い 1px の黒縁・濃い落ち影は使わない。

- **層 0 スクリム**（開いている間だけ）: \`rgba(12,9,20,.45)\` + \`backdrop-filter: blur(4px)\`、opacity 0 → 1、220ms easeOut。タップで閉じる
- **層 1 発光（FAB ラッパーの ::before）**: \`inset: -16px\` の円、ピンク \`rgba(255,170,200,.45)\`（\`60% 60% at 25% 60%\`）とラベンダー \`rgba(190,175,255,.40)\`（\`55% 55% at 78% 35%\`）、下に \`rgba(255,200,220,.25)\`。\`filter: blur(22px)\`、\`z-index: -1\`（ラッパーに \`isolation: isolate\`）
- **層 2 ガラス**（FAB・縦積みピル・扇形の丸ボタン共通）:
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`
  - \`::before\` 上部の反射（白 .22 → .06 at 35% → 0 at 60%）、\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\`（55% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **FAB**: 60px の円、lucide \`Plus\` 26px / 線幅 2、白。\`accent="red"\` では \`#e5322d\` 塗り（ぼかし無し）+ \`inset 0 1px 0 白 .28\` / \`0 8px 24px rgba(229,50,45,.36)\`。押下時 \`scale(.94)\`
- **stack**: FAB の上 16px から縦に gap 10px。右下では右揃え、左下では左揃え、下中央では中央揃え。各ピルは高さ 48px・\`border-radius: 9999px\`、15px / 500、左右に 36px の丸レンズ（白 .12 → .05 + \`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\` + \`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`）にアイコン 18px。右下ではアイコンを右側に置き、レンズが FAB の真上に縦一列に並ぶ
- **radial**: FAB の中心から 52px の丸ガラスボタンを扇形に配置。右下は真上 → 真左（90°→180°）、左下は真上 → 真右（90°→0°）、下中央は 160°→20° の上向きの扇。半径は \`max(100px, 66px × (個数 − 1) ÷ 弧の角度[rad])\`（隣同士の中心が 66px 以上離れる）。アイコン 22px。ラベルは各ボタンの 6px 下に常時表示（11px / 600、白 .92、\`text-shadow: 0 1px 6px rgba(12,9,20,.7)\`）
- \`:focus-visible\` は白 2px アウトライン（radial はガラス円に付ける）。ホバー可能な環境ではホバーで少し明るく
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- スプリング \`stiffness: 380, damping: 30, mass: 0.9\`
- FAB の \`Plus\` は開くと \`rotate: 45°\`（× になる）、閉じると 0°
- stack: 各ピル \`y: 18, scale: .85, opacity: 0 → y: 0, scale: 1, opacity: 1\`。FAB に近いものから 40ms ずつ遅らせて出す。\`transform-origin\` は FAB 側の下隅
- radial: 各ボタン FAB 中心（\`x: 0, y: 0, scale: .4, opacity: 0\`）→ 扇形の位置へ。配列順に 40ms ずつ遅らせる
- 閉じるときは 140ms easeIn で FAB 側へ戻りながら消える（\`AnimatePresence\`）
- メニューのコンテナ自体は \`opacity\` をアニメーションしない（子の \`backdrop-filter\` が切れるため）
- \`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- FAB: \`aria-haspopup="menu"\`、\`aria-expanded\`、開いている間 \`aria-controls={メニューの id}\`、\`aria-label\`
- メニュー: \`role="menu"\` + \`aria-labelledby={FAB の id}\`、各アクション \`role="menuitem"\`（\`tabIndex={-1}\`、ローヴィングフォーカス）
- キーボード（WAI-ARIA の menu button パターン）: Enter / Space / ↓ で開いて先頭項目へ、↑ で開いて末尾項目へフォーカス。項目上では ↑↓ で移動（端で循環）、Home / End で先頭 / 末尾。Escape で閉じて FAB にフォーカスを戻す（Safari はクリックでボタンにフォーカスしないので document で Escape を拾う）。Tab で閉じてフォーカスはそのまま次へ。項目を選ぶと閉じて FAB にフォーカスを戻す
- タップやマウスで開いたとき・最初から開いた状態でマウントされたときはフォーカスを動かさない
- \`touch-action: manipulation\`、\`-webkit-tap-highlight-color: transparent\`

### 受け入れ条件
- FAB を押すと背景が暗くぼけ、アクションがスプリングで順に飛び出し、＋ が × に回る
- 背景タップ・Escape・項目選択で閉じ、閉じるアニメーションが出る
- 閉じている間、FAB 以外のページ操作を一切邪魔しない
- キーボードだけで開く → 矢印で選ぶ → Enter で実行 → FAB にフォーカスが戻る、が通る
- iPhone のホームバー領域・角丸と重ならない
`;
