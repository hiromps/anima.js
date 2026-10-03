/**
 * Prompt material for TiltCard (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same card from scratch.
 */

export const setup = `
1. \`"use client"\` のコンポーネント（またはサーバーコンポーネントから直接）で \`<TiltCard className="w-[380px] max-w-full">…</TiltCard>\` を置く。幅は \`className\` で決め、高さは中身で決まる。
2. 最初の子に**カードの土台（背景アート）**を置く。\`aspect-ratio\` と \`border-radius: inherit\`（Tailwind なら \`rounded-[inherit]\`）を付けると角の丸みが \`radius\` に揃う。土台の中は \`overflow: hidden\` で自由に描いてよい。
3. 浮かせたい要素（ロゴ・数字・名前など）は \`import { TiltLayer } from "@/components/tilt-card"\` で包み、\`depth\`（px）を指定する。\`position: absolute\` で土台の上に重ねる。目安は 20〜60px、遠近感（\`perspective\`）が小さいほど強く飛び出す。
4. カード全体をリンクにしたい場合は、中にある \`<a>\` / \`<button>\` を通常どおり置く。フォーカスが入るとカードが少し浮き上がる（傾きはポインターのみ）。
5. 一覧に複数並べる場合も 1 枚ずつ独立して動く。待機中のゆらぎは画面外で自動停止する。
6. \`npm run build\` が通ることを確認し、PC（マウス）で「ポインターに向かって傾く」「グレアが反対側へ流れる」「離すと滑らかに戻る」、スマホで「ゆっくり揺れ続け、スクロールを妨げない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| TiltLayer が飛び出さず平面に見える | TiltCard と TiltLayer の間に普通の \`<div>\` を挟むと \`transform-style: preserve-3d\` が途切れる | TiltLayer は **TiltCard（または別の TiltLayer）の直接の子**に置く。まとめたい場合は TiltLayer 同士を入れ子にする |
| 角を丸めるために \`.card\` に \`overflow: hidden\` を足すとレイヤーが平らになる | \`overflow\` / \`opacity < 1\` / \`filter\` / \`isolation\` / \`mix-blend-mode\` は 3D を平面化する（グルーピングプロパティ） | カード本体やラッパーには付けない。**土台（平面の葉要素）側**で \`overflow: hidden\` と \`rounded-[inherit]\` を使う |
| 傾きが毎フレーム React を再レンダーして重い | ポインター位置を \`useState\` に入れている | 位置は \`useMotionValue\` → \`useSpring\` → \`useTransform\` で流し、イベントは rAF で 1 フレーム 1 回にまとめる（実装済み。state 化しない） |
| ポインターから遠ざかるように震える | 傾いた \`.card\` 自身の \`getBoundingClientRect()\` で座標を正規化している（回転で矩形が変わり、フィードバックする） | 傾かない外側の \`.root\` の矩形で計算する |
| スマホでカードが指に吸い付いてスクロールできない | タッチの \`pointermove\` で傾けている | タッチは無視してゆらぎを続ける（実装済み）。\`touch-action: pan-y\` を外さない |
| グレアの props を変えても反映されない | \`useTransform\` の関数が古い props をクロージャで保持 | props は motion value に写し、複数入力の \`useTransform\` で合成する |
`;

export const spec = `
### 前提
- React 19 + framer-motion 12。スタイルは CSS Modules（\`TiltCard.module.css\`）で完結し、Tailwind 不要
- エクスポート: \`TiltCard\`（default も）、\`TiltLayer\`、型 \`TiltCardProps\` / \`TiltLayerProps\`
- Props: \`maxTilt\`=14（deg）、\`perspective\`=1000（px）、\`scaleOnHover\`=1.04、\`glare\`=true、\`glareOpacity\`=0.35、\`holo\`=false、\`springStiffness\`=160、\`springDamping\`=20、\`radius\`=20（px）、\`idleAnimation\`=true、\`children\`、\`className\`
- \`TiltLayer\`: \`depth\`=30（px）＋任意の div 属性。\`transform: translateZ(var(--tc-depth))\` と \`preserve-3d\`

### 見た目
- 構造: \`.root\`（\`perspective: var(--tc-perspective)\`、\`touch-action: pan-y\`）→ \`.card\`（framer-motion で回転・拡大、\`transform-style: preserve-3d\`、\`border-radius: var(--tc-radius)\`、overflow は付けない）→ \`.content\`（preserve-3d、children）＋ ホロ箔 ＋ グレア
- CSS 変数 \`--tc-perspective: 1000px\` / \`--tc-radius: 20px\` を \`.root\` に既定値として持ち、既定と異なる値だけインラインで上書き
- **グレア**: \`translateZ(2px)\` の全面レイヤー。\`radial-gradient(farthest-corner circle at {gx}% {gy}%, 白 .9 0%, 白 .32 22%, 透明 58%)\`。位置はポインターの反対（\`gx = (1 - x) * 100\`）。不透明度 = \`glareOpacity × (0.55 + 0.45 × hover)\`
- **ホロ箔**: \`translateZ(1px)\`。\`repeating-linear-gradient(115deg, #ff77c8, #ffd36b 7%, #75ffc6 14%, #6fc6ff 21%, #b28aff 28%, #ff77c8 35%)\` を \`background-size: 320%\` で敷き、\`background-position\` をポインター位置（\`x*100% y*100%\`）で動かす。細い斜線（25deg、白 .18、4px 周期）を重ね、\`mix-blend-mode: color-dodge\`、\`saturate(1.15)\`。\`mask-image: radial-gradient(circle at {gx}% {gy}%, #000, rgba(0,0,0,.45) 38%, transparent 72%)\` でハイライト周辺だけに見せる。不透明度 0.5 → ホバーで 0.8
- **影**: \`{(0.5 - x) * 36}px {22 + (0.5 - y) * 24 + hover * 14}px 60px -18px rgba(0,0,0,.65), 0 2px 6px rgba(0,0,0,.3)\` — 持ち上がった側の反対へ落ちる
- デモ: 380px 幅・縦横比 1.586 の会員カード。暗いメッシュグラデーション＋ギョーシェ風の同心円＋フィルムグレインの土台、depth 26 のロゴ行、44 の IC チップ、58 のカード番号、34 の名義・有効期限

### モーション
- ポインター位置 \`x, y\`（0〜1、\`.root\` の矩形で正規化）を \`useMotionValue\` に入れ、\`useSpring({ stiffness, damping, mass: 0.7 })\` で平滑化
- \`rotateX = (0.5 - y) * 2 * maxTilt\`、\`rotateY = (x - 0.5) * 2 * maxTilt\`（カードがポインターの方を向き、ポインター側が奥へ下がる）
- hover / focus で \`active\` 0→1（spring 260 / 26）。\`scale = 1 + (scaleOnHover - 1) * active\`
- \`pointermove\` は rAF で 1 フレーム 1 回に間引く。\`pointerType === "touch"\` は無視
- 離れたら: \`idleAnimation\` ならゆらぎに戻る（スプリングで補間）、オフなら中央（水平）へ戻る
- **待機中のゆらぎ**: \`x = 0.5 + 0.3 sin(0.55t + 1.1)\`、\`y = 0.5 + 0.22 sin(0.37t + 2.4)\` のリサージュ。t=0 で既に傾いているので初回描画から立体に見える。rAF ループは IntersectionObserver で画面外なら停止
- \`prefers-reduced-motion: reduce\`: ゆらぎもポインター追従もせず、固定の軽い傾き（x .64 / y .36）で静止。\`<MotionConfig reducedMotion="user">\` で包む

### アクセシビリティ
- グレア・ホロ箔は \`aria-hidden\`、\`pointer-events: none\`。カードの中身は実テキストのまま読める
- カード自体はフォーカスを持たない。中の \`<a>\` / \`<button>\` にフォーカスが入るとカードが浮き上がる（focus-within 相当）
- 視差（ポインター追従の傾き）は前庭障害のトリガーになり得るため、reduced motion では無効化

### 受け入れ条件
- マウスでポインターの方へ滑らかに傾き、グレアが反対側へ流れ、TiltLayer が奥行きの差で視差を見せる
- ポインターが離れると滑らかに戻り、待機中はゆっくり揺れる（タッチ端末も同様、スクロールを妨げない）
- \`holo\` をオンにするとハイライト周辺だけ虹色の箔が光る
- ポインター移動中に React の再レンダーが発生しない
- reduced motion では静止した軽い傾きで表示される
`;
