/**
 * Prompt material for GlassSwitch (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same switch from scratch.
 */

export const setup = `
1. スイッチを置くコンポーネント（\`"use client"\`）で \`const [checked, setChecked] = useState(true)\` を持ち、\`<GlassSwitch checked={checked} onCheckedChange={setChecked} />\` を置く。状態を親で持つ必要がなければ \`defaultChecked\` だけ渡す非制御でもよい。
2. 設定画面の行として使うときは \`label\`（と \`description\`）を渡す。行全体（テキスト部分 + スイッチ）がタップ領域になり、ラベルはスクリーンリーダー向けにも関連付けられる。
3. ラベルを表示しない単体スイッチには \`aria-label\` を渡すか、外側の \`<label htmlFor={id}>\` と \`id\` で関連付ける。名前の無いスイッチにしない。
4. ガラスなので **暗く、色のある背景の上** に置く。真っ白・単色の背景ではすりガラスと発光が見えない。
5. フォームで送信するなら \`name\`（必要なら \`value\`、既定は \`"on"\`）を渡す。オンのときだけ hidden input が出力され、ネイティブのチェックボックスと同じ送信結果になる。
6. \`npm run build\` が通ることを確認し、実機で「タップでつまみがスプリングで移動する」「押している間つまみが伸びる」「オンでピンク→ラベンダーに光る」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でトラックのぼかしが効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| オンのときに押すと、つまみがトラックの右からはみ出す | 伸びる幅だけ \`width\` を広げ、\`x\` をそのままにしている | オン中の押下は \`x = travel − stretch\` にして左方向へ伸ばす（同梱の計算を変えない） |
| サイズを変えるとつまみの位置がずれる | CSS のサイズ変数と TS の \`SIZES\` が食い違っている | \`--gsw-width / height / thumb\` と \`SIZES\` を必ず両方そろえて変更する |
| オンで初期表示したスイッチが、表示のたびに左から滑ってくる | \`motion.span\` の \`initial\` を外した | \`initial={false}\` を外さない |
| 視差効果オフでもつまみが滑る | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）
- ファイル: \`components/glass-switch/index.tsx\`（\`"use client"\`）+ \`GlassSwitch.module.css\`
- props: \`checked\` / \`defaultChecked\` / \`onCheckedChange(checked)\`（制御・非制御の両対応）、\`label\`、\`description\`、\`disabled\`、\`size\`（\`"md"\` 51×31 / \`"sm"\` 40×24）、\`glowColorA\` / \`glowColorB\`、\`springStiffness\` / \`springDamping\`、\`name\` / \`value\`、\`id\`、\`aria-label\`
- \`label\` があると行レイアウト: \`display: flex; align-items: center; gap: 14px; width: 100%; min-height: 44px\`、左にテキスト（\`<label htmlFor={スイッチの id}>\`、flex: 1）、右にスイッチ
- 色の既定値は CSS のカスタムプロパティ（\`--gsw-glow-a\` など）が持ち、コンポーネントは既定以外の値のときだけインラインで上書きする

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「発光 → ガラスのトラック → 発光する塗り → ガラスの玉」。硬い 1px の黒縁・濃い落ち影は使わない。

- **サイズ**: md はトラック 51×31・つまみ 27px、sm は 40×24・20px。内側の余白はどちらも 2px。押下時の伸び幅は md 7px / sm 5px
- **層 1 発光（.control::before）**: \`inset: -6px -8px\`、ピンク \`rgba(255,170,200,.45)\`（\`60% 70% at 25% 60%\`）とラベンダー \`rgba(190,175,255,.40)\`（\`60% 70% at 78% 40%\`）、下辺に \`rgba(255,200,220,.25)\`。\`filter: blur(10px)\`（パネル用の 26px は小さな部品には強すぎるので縮小）。オフ時 opacity .35、オン時 1（300ms）
- **層 2 トラック**: \`border-radius: 9999px\`、\`overflow: hidden\`
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(20px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 4px 14px rgba(255,170,205,.16)\` / \`0 6px 16px rgba(0,0,0,.28)\`。オン時は外光を \`0 0 16px rgba(255,170,205,.45)\` に強める
  - \`::before\` 上部の反射（白 .22 → .06 at 45% → 0 at 70%）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **オンの塗り（.fill）**: 平坦な単色ではなく発光。\`linear-gradient(90deg, 発光色 A 92%, 発光色 B 92%)\` の上に、左寄りの淡いピンクの光だまり（\`radial-gradient(70% 120% at 22% 30%, #ffc8dc 85%, transparent 70%)\`）。\`inset 0 1px 0 白 .5\` / \`inset 0 0 10px 白 .35\`。opacity 0 → 1、250ms
- **層 3 つまみ（白いガラスの玉）**: 円形、\`top / left: 2px\`。上部に白いハイライト（\`radial-gradient(80% 60% at 50% 18%, 白, 透明 70%)\`）+ \`linear-gradient(180deg, 白 .95, 白 .80)\`、\`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\`。box-shadow: \`inset 0 1px 0 白 .9\` / \`inset 0 0 0 1px 白 .6\` / 下側にうっすらラベンダー / \`0 2px 6px rgba(0,0,0,.2)\` / \`0 3px 12px rgba(255,170,205,.22)\`
- **行のテキスト**: ラベル 16px / 500、説明 13px / 行間 1.45 / 白 .64。テキスト部分は上下 8px の余白でタップしやすく
- 無効時は全体 opacity .45、\`cursor: not-allowed\`
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- つまみは \`motion.span\` で \`x\` と \`width\` をアニメーション。スプリング \`stiffness: 380, damping: 30, mass: 0.9\`、\`initial={false}\`（マウント時は動かさない）
- 移動量 \`travel = トラック幅 − 2 × 余白 − つまみ径\`（md 20px / sm 16px）。オフは \`x: 0\`、オンは \`x: travel\`
- iOS と同じく、押している間はつまみが横に伸びる: \`width = つまみ径 + 伸び幅\`。オンのときは \`x = travel − 伸び幅\` にして中央（左）方向へ伸ばし、トラックからはみ出させない
- 押下状態は行全体（ラベル部分も含む）の \`pointerdown\` / \`pointerup\` / \`pointerleave\` / \`pointercancel\` で管理。無効時は伸びない
- 塗りと背後の発光は CSS の opacity トランジション（\`prefers-reduced-motion: reduce\` では無効）
- \`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- \`<button type="button" role="switch" aria-checked>\`。Enter / Space はネイティブの button のクリックとして切り替わる
- ラベルがあるときは \`aria-labelledby\`（ラベル）と \`aria-describedby\`（説明）、無いときは \`aria-label\`
- \`<label htmlFor>\` でテキストをタップしても切り替わる。\`disabled\` 時は button を \`disabled\` にし、切り替わらない
- \`:focus-visible\` で白 2px アウトライン（offset 3px）。\`touch-action: manipulation\`、\`-webkit-tap-highlight-color: transparent\`
- \`name\` があり、オンかつ有効なときだけ \`<input type="hidden" name value>\` を出力する

### 受け入れ条件
- タップ・クリック・Enter・Space で切り替わり、つまみがスプリングで移動する
- 押している間つまみが伸び、オン状態でもトラックからはみ出さない
- オンでトラックがピンク→ラベンダーのグラデーションで光り、背後に淡い発光がにじむ
- ラベル付きでは行のどこ（テキスト部分）をタップしても切り替わる
- スクリーンリーダーで「スイッチ、オン／オフ」とラベル名が読み上げられる
`;
