/**
 * Prompt material for MagneticButton (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same button from scratch.
 */

export const setup = `
1. 置きたい場所で \`<MagneticButton onClick={…}>はじめる</MagneticButton>\` を使う。リンクにするなら \`href\` を渡す（\`<a>\` で描画される。\`next/link\` は使っていないので、クライアント遷移が必要なら \`onClick\` で \`router.push\` する）。
2. コンポーネント自体が \`"use client"\` なので、Server Component のページにそのまま置ける。ただし \`onClick\` を渡すなら呼び出し側も Client Component にする（関数は Server → Client に渡せない）。
3. 吸着は「ボタンの縁から \`radius\` px」で始まり、ボタン自体も最大で \`strength × 0.4 ×\` ポインターとの距離だけ動く。隣のボタンと近い場合は \`radius\` を小さめ（60px 前後）にすると、両方が同時に引っ張られて見えるのを防げる。
4. 親に \`overflow: hidden\` があると、引き寄せられたボタンとソリッドの発光（box-shadow）が切れる。周囲に \`radius × strength × 0.4\` 程度の余白を確保する。
5. 色は \`color\`（ベース）/ \`textColor\`（ソリッドの文字）/ \`fillColor\`（ホバーの塗り＋発光）/ \`fillTextColor\`（塗り上の文字）で変える。ソリッドの発光は \`fillColor\` から作られる。
6. フォーム送信ボタンにするなら \`type="submit"\`。既定は \`"button"\`（フォーム内で誤送信しない）。
7. \`npm run build\` が通ることを確認し、マウスで「近づくと吸い付く」「入った点から色が広がり、出た点に向かって縮む」、スマホで「吸着せず押下時に縮むだけ」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ボタンがプルプル震える / 吸着が暴れる | 動いている要素自身の \`getBoundingClientRect()\` で中心を測り、移動量が測定にフィードバックしている | 計測は**動かない外側の \`<span>\`（.root）**で行い、transform は内側の \`.shell\` にだけかける構造を崩さない |
| ポインターを動かすと全体が重い | 移動量を \`useState\` に入れて毎回再レンダーしている | \`useMotionValue\` → \`useSpring\` に書き込むだけにする。計算は \`requestAnimationFrame\` で 1 フレーム 1 回 |
| 隣のリンクがクリックできない | 吸着範囲を「透明な大きいヒットエリア」で作っている | 範囲判定は \`window\` の passive な \`pointermove\` で行う（画面内にある間だけ IntersectionObserver で購読） |
| スマホでタップ後にボタンがずれたまま | タッチの pointer イベントで吸着・塗りを動かしている | \`pointerType === "touch"\` は無視し、\`(hover: hover) and (pointer: fine)\` のときだけ購読する |
| 塗りが角まで届かない | \`clip-path: circle()\` の半径が足りない | \`circle(150% at x y)\`。circle の % は対角線 / √2 が基準なので、入口が角でも 150% で覆える |
| 視差効果オフでも動く | framer-motion の JS アニメーションには CSS の reduced-motion が効かない | \`useReducedMotion()\` で吸着を止め、\`<MotionConfig reducedMotion="user">\` を外さない。塗りは CSS の \`@media (prefers-reduced-motion)\` でフェードに切り替わる |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/magnetic-button/MagneticButton.tsx\`（\`"use client"\`）+ \`MagneticButton.module.css\` + \`index.ts\`
- props: \`children\`、\`href?\`、\`onClick?\`、\`variant\`（\`"solid" | "outline" | "ghost"\`）、\`size\`（\`"sm" | "md" | "lg"\`）、\`strength\`（0–1、既定 0.45）、\`radius\`（px、既定 90）、\`color\` / \`textColor\` / \`fillColor\` / \`fillTextColor\`、\`showArrow\`、\`springStiffness\`（220）/ \`springDamping\`（18）、\`disabled\`、\`type\`、\`className\`
- \`href\` があれば \`motion.a\`、無ければ \`motion.button\`（\`type\` 既定 \`"button"\`）

### 構造
\`\`\`
span.root          … 動かない。計測用・CSS 変数とバリアントの data 属性を持つ
  motion.button.shell  … 吸着の x/y と押下 scale。overflow: hidden のピル
    span.fill      … ホバーの塗り（aria-hidden）
    motion.span.label  … 視差の x/y。テキスト + 任意の ArrowRight
\`\`\`

### 見た目
- ピル（\`border-radius: 999px\`）。高さ / 左右 padding / 文字: sm 36 / 16 / 13px、md 48 / 24 / 15px、lg 60 / 32 / 17px。字重 560、字間 -0.01em
- CSS 変数（.root に既定値、既定と違う値だけインラインで上書き）: \`--mb-color: #f5f5f7\`、\`--mb-text: #0a0a0a\`、\`--mb-fill: #7c5cff\`、\`--mb-fill-text: #fff\`
- **solid**: 背景 \`linear-gradient(180deg, 白 .22, 透明 55%)\` + \`--mb-color\`、文字 \`--mb-text\`。box-shadow: \`inset 0 1px 0 白 .55\` / \`inset 0 -1px 0 黒 .12\` / \`0 0 0 1px color-mix(color 40%)\` / \`0 8px 28px -6px color-mix(fill 55%)\` / \`0 0 48px -12px color-mix(fill 60%)\`。ホバー前から発光していて「主ボタン」に見えること
- **outline**: 背景 白 .03、\`inset 0 0 0 1px color-mix(color 28%)\`、文字 \`--mb-color\`。ホバーで枠が fill 色 70% になり淡い発光
- **ghost**: 文字だけ。塗りはホバーで出る
- 塗り: \`position: absolute; inset: 0; z-index: -1; background: var(--mb-fill)\`、\`clip-path: circle(0% at var(--mb-x) var(--mb-y))\` → ホバーで \`circle(150% at …)\`、\`0.55s cubic-bezier(.22,1,.36,1)\`
- ホバー中は文字色を \`--mb-fill-text\` へ（0.3s、0.06s 遅延して塗りが届いてから）。矢印は \`translateX(4px)\`
- \`:focus-visible\`: \`outline: 2px solid var(--mb-fill); outline-offset: 3px\`、塗りが中央から満ちて文字色も反転
- disabled: opacity .45、\`cursor: not-allowed\`、吸着・塗りなし。リンクの場合は \`href\` を外して \`aria-disabled="true"\`

### モーション
- 吸着: \`window\` の passive \`pointermove\` を、IntersectionObserver（\`rootMargin: radius px\`）で画面内にある間だけ購読。\`(hover: hover) and (pointer: fine)\` でない端末・reduced motion・disabled・\`strength = 0\` では購読しない
- 計算は rAF で 1 フレーム 1 回: .root の rect 中心との差 \`dx, dy\`、縁からの距離 \`edge\`。\`edge >= radius\` なら 0 へ。範囲内は \`pull = strength × (1 - edge / radius)\`、shell は \`d × pull × 0.4\`、label は追加で \`d × pull × 0.22\`（枠より大きく動く）
- 値は \`useMotionValue\` → \`useSpring({ stiffness, damping, mass: 0.6 })\`。React state は使わない。ウィンドウ外へ出たら 0 に戻す
- 塗りの起点: \`pointerenter\` / \`pointerleave\` で shell 内の座標を \`--mb-x\` / \`--mb-y\` に直接書き、.root の \`data-hovered\` を付け外し（入った点から広がり、出た点へ縮む）。\`pointerType === "touch"\` は無視
- 押下: \`whileTap={{ scale: .96 }}\`（タッチでもこれだけは効く）
- \`<MotionConfig reducedMotion="user">\` で包む。reduced motion の CSS では塗りを clip-path なしの opacity フェード、矢印は動かさない

### アクセシビリティ
- ネイティブの \`<button>\` / \`<a>\`。キーボード操作・フォーカスはブラウザ標準のまま
- 塗りと矢印は \`aria-hidden\`。アイコンだけのボタンにする場合は \`aria-label\` を渡す
- 吸着でボタンが動いてもクリック判定は動いた位置に追従する（transform のため）

### 受け入れ条件
- マウスがボタンの縁から \`radius\` px 以内に入ると、ボタンが滑らかに引き寄せられ、ラベルがさらに少し先へ動く。範囲外に出ると揺れ戻りながら元の位置へ
- 入った点から塗りが円形に広がり文字色が反転、出た点に向かって縮む
- スマホでは吸着・塗りがなく、押すと縮むだけ
- reduced motion では吸着せず、色だけがフェードで切り替わる
- 初期表示（ホバーなし）でもソリッドは発光をまとった主ボタンに見える
`;
