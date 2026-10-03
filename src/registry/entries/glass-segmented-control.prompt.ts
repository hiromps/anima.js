/**
 * Prompt material for GlassSegmentedControl (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same control from scratch.
 */

export const setup = `
1. 置くコンポーネントを \`"use client"\` にし、\`const [value, setValue] = useState("all")\` を持って \`<GlassSegmentedControl options={…} value={value} onValueChange={setValue} aria-label="…" />\` を置く。状態を外に出さなくてよい場合は \`value\` / \`onValueChange\` を外して \`defaultValue\` だけ渡す（非制御）。
2. \`options\` は \`{ value, label, icon? }\` の配列。\`value\` は一意な文字列にする（React の key と選択判定に使う）。\`icon\` には lucide-react のアイコンコンポーネント（\`Truck\` など）をそのまま渡す。
3. 必ず \`aria-label\`（または見出しの id を \`aria-labelledby\`）を渡す。スクリーンリーダーはこれをグループ名として読み上げる。
4. 暗いページの上で使う前提のガラス。背後が単色の暗い面だとぼかしが見えないので、カラフルなコンテンツや画像の上に置くとトンマナどおりに見える。
5. 4〜5 セグメントをスマホ幅に収めるなら \`fullWidth\` を付ける（均等幅・余白を詰める）。ラベルは 2〜4 文字程度を推奨。収まらない分は省略記号（…）になる。
6. \`npm run build\` が通ることを確認し、実機で「タップでピルがばねで移動する」「Tab で選択中セグメントにだけ止まり、矢印キーで選択が動く」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| Chrome でぼかしが一切効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 同じページの別のコントロールにピルが飛んでいく | framer-motion の \`layoutId\` はページ全体で共有される | \`layoutId\` は \`useId()\` 由来のインスタンス固有の値のままにする。固定文字列にしない |
| ピルがラベルの上に被る / 見えない | ピルの重なり順が崩れている | セグメントは \`position: relative; z-index: 1\`、ピルは \`z-index: -1\`（セグメント内のスタッキングコンテキストで文字の背面） |
| フォーカスリングが欠ける | トラックの \`overflow: hidden\` で外側のアウトラインが切れる | \`outline-offset: -2px\` で内側に描く |
| 視差効果オフでもピルが移動アニメーションする | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/glass-segmented-control/GlassSegmentedControl.tsx\`（\`"use client"\`）+ \`GlassSegmentedControl.module.css\` + \`index.ts\`
- Props: \`options: { value: string; label: string; icon?: LucideIcon }[]\`、\`value\` / \`defaultValue\` / \`onValueChange(value)\`（制御・非制御の両対応。非制御の初期値は先頭の option）、\`size: "sm" | "md" | "lg"\`（既定 md）、\`fullWidth\`、\`glowColorA\`（既定 \`#ffaac8\`）/ \`glowColorB\`（既定 \`#beafff\`）、\`blur\`（既定 30）、\`springStiffness\`（380）/ \`springDamping\`（30）、\`disabled\`、\`aria-label\` / \`aria-labelledby\`、\`className\`
- CSS 変数は \`--gsc-\` 接頭辞で \`.root\` に既定値を持ち、コンポーネントは既定と違う値のときだけインラインで上書きする。発光色 A からは \`color-mix(in srgb, A n%, white)\` で淡い派生色（外光・下辺・ラベル発光）を作る

### 見た目 = GlassBottomTabBar と同じグラスモーフィズム
層構成は「発光 → ガラスのトラック → レンズのピル → ラベル」。硬い 1px の黒縁・濃い落ち影・角は使わない。

- **ルート（.root）**: \`display: inline-flex; position: relative; isolation: isolate\`。\`fullWidth\` では \`display: flex; width: 100%\`。\`disabled\` で \`opacity: .5\`
- **層 0 発光（.root::before）**: \`inset: -14px -10px -18px\`、\`z-index: -1\`、\`filter: blur(22px)\`。ピンク 45%（\`55% 80% at 22% 70%\`）、ラベンダー 40%（\`50% 80% at 78% 30%\`）、下辺に淡いピンク \`#ffc8dc\` 25%（\`70% 60% at 50% 100%\`）
- **層 1 トラック（.track）**: \`role="radiogroup"\`、高さ sm 36px / md 44px / lg 52px、\`padding: 4px\`、\`border-radius: 9999px\`、\`overflow: hidden\`、横 flex
  - background: \`linear-gradient(180deg, rgba(255,255,255,.17), rgba(255,255,255,.09))\`
  - \`backdrop-filter: blur(30px) saturate(170%)\`（unprefixed のみ）
  - box-shadow: \`inset 0 1px 0 白 .45\` / \`inset 0 0 0 1px 白 .20\` / \`0 8px 32px rgba(255,170,205,.16)\` / \`0 18px 48px rgba(0,0,0,.32)\`
  - \`::before\` 上半分の反射（白 .22 → .06 at 40% → 0 at 58%）、\`::after\` 下辺にピンク \`#ffbed7\` 12%（50% から）
  - \`@supports not (backdrop-filter: blur(1px))\` では \`rgba(70,60,78,.94) → rgba(40,34,48,.94)\`
- **セグメント（button）**: \`role="radio"\`、ピル形、横 padding sm 12px / md 16px / lg 20px（\`fullWidth\` では \`flex: 1 1 0\` の均等幅で 6px）。文字 sm 13px / md 14px / lg 15px、500、白 .64。選択中は白 + ラベルに \`0 0 10px\` の淡いピンク発光。アイコンは sm 14 / md 16 / lg 18px、\`strokeWidth 1.8\`、ラベルの左に gap 6px、選択中は \`drop-shadow(0 0 6px …)\`。ラベルは \`text-overflow: ellipsis\`
  - 押下時 \`scale(.96)\` 120ms、\`:focus-visible\` は白 .9 の 2px アウトラインを \`outline-offset: -2px\` で内側に
- **層 2 ピル（選択中のレンズ）**: 選択中セグメント内に \`position: absolute; inset: 0; z-index: -1\`。白 .12 → .05 のグラデーション、\`backdrop-filter: blur(8px) saturate(160%) brightness(1.08)\`、box-shadow \`inset 0 1px 0 白 .55\` / \`inset 0 0 0 1px 白 .42\` / \`0 4px 16px rgba(255,170,205,.18)\`、\`::before\` に上辺だけの薄い反射。\`will-change: transform\`
- フォント: \`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", Roboto, sans-serif\`

### モーション
- ピルは選択中セグメントの中にだけ描画し、\`layoutId\` でセグメント間を移動させる。\`layoutId\` は \`useId()\` から作りインスタンスごとに一意にする
- スプリング \`stiffness: 380, damping: 30, mass: 0.9\`（少しだけ行き過ぎる）
- \`<MotionConfig reducedMotion="user">\` で包む（OS の視差効果を減らす設定ではピルが即座に切り替わる）

### アクセシビリティ
- トラックは \`role="radiogroup"\` + \`aria-label\` / \`aria-labelledby\`、各セグメントは \`role="radio" aria-checked\` の \`<button type="button">\`
- ロービング tabindex: 選択中のセグメントだけ \`tabIndex=0\`、他は \`-1\`（選択値が options に無いときは先頭が 0）
- ArrowRight / ArrowDown で次、ArrowLeft / ArrowUp で前（端で折り返し）、Home で先頭、End で末尾。移動と同時に選択し、そのボタンにフォーカスを移す（ネイティブのラジオと同じ）
- \`disabled\` では全ボタンを \`disabled\`、トラックに \`aria-disabled\`
- マウント時にフォーカスを奪わない。\`touch-action: manipulation\`、\`-webkit-tap-highlight-color: transparent\`

### 受け入れ条件
- タップ / クリックでピルがばねで隣のセグメントへ移動し、選択中のラベルが白く光る
- 暗いページのカラフルなコンテンツの上で、トラック越しに背後の色がぼけて乗る
- キーボードだけで選択でき、Tab ではグループ内の 1 箇所にしか止まらない
- 同じページに 2 つ置いても、ピルが互いに干渉しない
`;
