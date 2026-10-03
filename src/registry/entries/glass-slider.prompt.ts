/**
 * Prompt material for GlassSlider (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same slider from scratch.
 */

export const setup = `
1. スライダーを置くコンポーネント（\`"use client"\`）で \`const [value, setValue] = useState(60)\` を持ち、\`<GlassSlider value={value} onValueChange={setValue} aria-label="音量" />\` を置く。状態を持たなくてよい場合は \`defaultValue={60}\` だけでも動く（非制御）。
2. 範囲は \`min\` / \`max\` / \`step\`（既定 0 / 100 / 1）。ドラッグもキー操作も \`step\` 単位に丸められる。
3. 保存・API 送信などの重い処理は \`onValueCommit\` につなぐ。ドラッグを離した時と、キー操作ごとに 1 回だけ呼ばれる（\`onValueChange\` はドラッグ中に毎フレーム呼ばれる）。
4. アイコンは lucide-react のコンポーネントを \`iconStart\` / \`iconEnd\` に渡す（例: 音量 \`Volume1\` / \`Volume2\`、明るさ \`SunDim\` / \`Sun\`）。表示用の値ラベルは \`showValue\`、書式は \`formatValue={(v) => v + "%"}\` のように変える。
5. 見出しテキストがある場合は \`aria-labelledby\` でその id を指す。無ければ \`aria-label\` を必ず渡す（スクリーンリーダーが何のスライダーか読み上げられない）。
6. 幅は親いっぱい（\`width: 100%\`）、高さは 44px 固定。暗い背景の上に置く前提のガラスなので、明るい背景ではガラスの白が見えにくい。
7. \`npm run build\` が通ることを確認し、実機で「横ドラッグで値が動き、縦スワイプではページがスクロールする」「押している間トラックがわずかにつぶれ、離すとばねで戻る」「Tab でフォーカスリングが出て矢印キーで動く」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 指がトラックから外れるとドラッグが止まる | \`pointermove\` をトラック上でしか受けていない | \`pointerdown\` で \`setPointerCapture\` する処理を外さない |
| スマホで横ドラッグするとページが動く / 縦スクロールできない | \`touch-action\` の指定違い | トラックは \`touch-action: pan-y\` のまま（横はスライダー、縦はページ） |
| ドラッグ中に塗りが指から遅れる | ドラッグ中もスプリングで追従させている | ドラッグ中は motion value を \`jump()\`、クリック / キー操作だけ \`animate()\` でばね移動 |
| 視差効果オフでもつぶれ・ばねが動く | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` と \`useReducedMotion()\` の分岐を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-slider/index.tsx\`（\`"use client"\`）+ \`GlassSlider.module.css\`
- 制御 / 非制御: \`value\` / \`defaultValue\` / \`onValueChange(value)\`、\`onValueCommit(value)\`、\`min\`（0）/ \`max\`（100）/ \`step\`（1）
- その他: \`thumb: "lens" | "none"\`（既定 \`"lens"\`）、\`showValue\`、\`formatValue\`、\`iconStart\` / \`iconEnd\`（\`LucideIcon\`）、\`disabled\`、\`glowColorA\` / \`glowColorB\` / \`blur\`、\`springStiffness\`（380）/ \`springDamping\`（32）、\`aria-label\` / \`aria-labelledby\`
- 値は常に \`step\` に丸めて \`min〜max\` にクランプ（\`toFixed(step の小数桁)\` で浮動小数のノイズを消す）

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「発光 → ガラス → 塗り → レンズ → アイコン」。硬い 1px の黒縁・濃い落ち影は使わない。

- **ルート**: \`position: relative; isolation: isolate; width: 100%\`、文字色は白
- **層 1 発光（.root::before）**: \`inset: -12px -8px -16px\`、ピンク \`rgba(255,170,200,.45)\`（\`60% 70% at 18% 70%\`）とラベンダー \`rgba(190,175,255,.40)\`（\`55% 65% at 84% 30%\`）、下辺に \`rgba(255,200,220,.25)\`。\`filter: blur(22px)\`、\`opacity: .85\`、ドラッグ中は 1（300ms）
- **層 2 トラック（.track）**: 高さ 44px、\`border-radius: 9999px\`、\`overflow: hidden\`、\`isolation: isolate\`
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`
  - \`::before\` 上部の反射（白 .22 → .06 at 45% → 0 at 70%）を **塗りより上**（z-index 2）に重ね、塗りがガラスの下にあるように見せる。\`::after\` 下辺にピンク \`rgba(255,190,215,.12)\`
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **層 3 塗り（.fill）**: 左端から現在値まで。\`linear-gradient(90deg, ピンク 92% + 白, ラベンダー)\`、\`opacity: .9\`、\`inset 0 1px 0 白 .55\` / \`inset -8px 0 16px 白 .28\`
  - \`thumb="lens"\`: 幅 = \`calc(p×100% + 44px×(1−p))\`（最小値でもレンズの下に丸い塗りが残る）
  - \`thumb="none"\`: 幅 = \`p×100%\`（塗りの端がつまみ。最小値で空になる）
- **層 4 レンズ（.lens, thumb="lens" のみ）**: 36px の円、top 4px、left = \`calc(p×100% + 4px − 44px×p)\`。白 .18 → .06、\`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\`、\`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`
- **層 5 中身（.content）**: 横 flex、padding \`0 13px\`、gap 8px、\`pointer-events: none\`。[iconStart] [余白] [値ラベル] [iconEnd]。アイコン 18px / strokeWidth 2、値ラベル 13px / 600 / \`tabular-nums\`。白 .95 + \`drop-shadow(0 1px 2px rgba(60,30,70,.35))\` で淡い塗りの上でも読めるようにする
- \`disabled\` はルートごと \`opacity: .45\`
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- 塗りとレンズは 0〜1 の motion value（\`useMotionValue\`）から \`useTransform\` で幅 / left を作る
  - クリック（pointerdown）・キー操作: \`animate(mv, p, { type: "spring", stiffness: 380, damping: 32, mass: 0.9 })\`
  - ドラッグ中（pointermove）: \`mv.jump(p)\` で指に 1:1 追従
- ドラッグ: トラックのどこでも \`pointerdown\` → \`setPointerCapture\`。レンズありはレンズの中心が指に来るよう \`(x − 22) / (幅 − 44)\`、なしは \`x / 幅\` で値を算出。\`pointerup\` / \`pointercancel\` / \`lostpointercapture\` で終了し \`onValueCommit\`
- 押している間トラックが \`scaleX: 1.015, scaleY: .92\` につぶれ、離すと同じスプリングで 1 に戻る
- \`<MotionConfig reducedMotion="user">\` で包み、\`useReducedMotion()\` が true なら塗りも \`jump()\`

### アクセシビリティ
- トラックが \`role="slider"\`、\`tabIndex={0}\`（disabled では -1 + \`aria-disabled\`）、\`aria-valuemin\` / \`aria-valuemax\` / \`aria-valuenow\` / \`aria-valuetext\`（\`formatValue\` の結果）、\`aria-orientation="horizontal"\`、\`aria-label\` か \`aria-labelledby\`
- キー: →/↑ で +step、←/↓ で −step、PageUp / PageDown で ±範囲の 1/10（最低 1 step）、Home / End で最小 / 最大。各操作で \`onValueCommit\`
- \`:focus-visible\` で白 2px アウトライン（offset 3px）。塗り・レンズ・アイコンは \`aria-hidden\`
- \`touch-action: pan-y\`、\`-webkit-tap-highlight-color: transparent\`、\`user-select: none\`

### 受け入れ条件
- トラックのどこを押しても値がそこへばねで移動し、そのまま横ドラッグすると指に遅れず追従する。指がトラック外に出ても追従が続く
- 押している間トラックがわずかにつぶれ、離すとばねで戻る。背後の発光が少し明るくなる
- 暗い背景の上でガラスが背後の色を拾って透け、塗りがピンク → ラベンダーに光る
- キーボードだけで全操作ができ、スクリーンリーダーが名前と値を読み上げる
`;
