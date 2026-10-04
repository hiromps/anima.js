/**
 * Prompt material for FanCarousel (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same fan from scratch.
 */

export const setup = `
1. 扇を置くコンポーネントで \`<FanCarousel items={[…]} aria-label="…" />\` を描画する。\`onIndexChange\` / \`renderItem\` は関数なので、渡すなら呼び出し側も \`"use client"\` にする（\`items\` だけなら Server Component から渡せる）。
2. \`items\` は \`{ id?, title?, subtitle?, image?, alt? }\` の配列。\`image\` は CSS の background 値（\`linear-gradient(…)\`、\`url(…) 50% 40% / 66% auto no-repeat, linear-gradient(…)\` のような重ね）をそのまま使い、それ以外は画像 URL として \`center / cover\` で敷く。\`background\` として表示されるので \`next/image\` の最適化は効かない。大きな画像は事前に縮小しておく。
3. ルートは親の幅いっぱい（\`width: 100%\`）に広がり、その幅に扇が収まらなければ自動で縮小する。高さは扇の形（\`spread\` / \`radius\` / \`cardWidth\` / \`aspect\` / \`lift\` / \`maxVisible\`）から計算されるので、親に固定の高さは要らない。
4. 外側のカードは扇の外まで回り込み、配るイントロでは山札が少し下から出てくる。**祖先に \`overflow: hidden\` があると切れる**ので、切りたくない場合は余白を取るか \`overflow: visible\` にする。
5. 選択中のカードを外から制御するなら \`index\` + \`onIndexChange\` を組み合わせる。\`onIndexChange\` で state を更新しないと、離した後に元のカードへ戻る（意図した挙動）。
6. 色味は CSS 変数で変える: \`className\` で \`--fc-accent\`（枠線・番号・光）、\`--fc-surface\`、\`--fc-card-radius\` を上書きする。
7. \`npm run build\` が通ることを確認し、「ドラッグでバネのように追従して近いカードに止まる」「カードのクリックで選択」「← / → / Home / End」「スマホで縦スクロールが妨げられない」「トラックパッドの横スクロールで送れる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| カードをクリックしても選択されない | 押した瞬間に \`setPointerCapture\` すると click の対象がステージに変わる | キャプチャは 6px 以上動いてドラッグになってから。ドラッグ直後の click は無視する |
| 浮き上がり・ホバーがまっすぐ上に動き、扇から外れて見える | \`translateY\` を \`rotate\` より前に書いている | \`rotate(θ) translateY(−lift)\` の順で 1 本の transform にし、\`transform-origin\` を手元の回転軸（\`50% calc(50% + radius)\`）にする |
| カードが回転軸の方へずれる / 小さく沈む | 遠い回転軸を基準に \`scale()\` している | 奥行きは \`scale\` ではなく暗幕（opacity）で表す |
| ページを縦にスクロールできない / ホイールが奪われる | ステージの \`touch-action\` を外した、または縦ホイールまで拾っている | \`touch-action: pan-y\` を外さない。ホイールは \`|deltaX| > |deltaY|\` のときだけ処理する（\`passive: false\` は横スワイプでの「戻る」を止めるため） |
| 視差効果オフでもバネで動く・配られる | \`useSpring\` と \`animate(motionValue)\` は \`MotionConfig\` の reducedMotion を見ない | \`useReducedMotion()\` を見て \`position.jump()\` で即時移動し、配る演出は最初から完了状態にする |
| ドラッグ中にカクつく | 毎フレーム React の state を更新している | 位置は MotionValue だけで動かす。state は中央のカード番号が変わったときだけ |
| サーバーとクライアントで見た目が違う（ハイドレーション警告） | 山札の傾きに \`Math.random\` を使った、レンダー中に \`window\` を読んだ | 傾きはインデックスから決め打ち。サイズ合わせは ResizeObserver（エフェクト内）で行う |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/fan-carousel/FanCarousel.tsx\`（\`"use client"\`）+ \`FanCarousel.module.css\` + \`index.ts\`
- props: \`items\`（\`{ id?, title?, subtitle?, image?, alt? }[]\`）、\`index?\` / \`defaultIndex = 0\` / \`onIndexChange?\`、\`spread = 56\`（deg、表示される左右全体の開き）、\`radius = 600\`（px、カード中心から回転軸まで）、\`cardWidth = 160\`、\`aspect = 1.55\`、\`lift = 32\`（px）、\`maxVisible = 4\`（片側）、\`dealIn = true\`、\`springStiffness = 260\`、\`springDamping = 28\`、\`showControls = true\`、\`renderItem?(item, { index, total, active, offset })\`、\`className\`、\`aria-label = "カードの扇"\`
- 状態: \`target\`（MotionValue。ドラッグ中は直接書く）→ \`useSpring\` の \`position\` が全カードを動かす。React の state は確定したカード番号と、中央のカード番号（丸めた position が変わったときだけ）

### 見た目
- CSS 変数（ルートが既定値、既定と違う値だけインライン）: \`--fc-card-w: 160px\`、\`--fc-aspect: 1.55\`、\`--fc-radius: 600px\`、\`--fc-card-radius: 14px\`、\`--fc-surface: #15121a\`、\`--fc-accent: #f1d29a\`。\`--fc-stage-h\` / \`--fc-anchor-y\` / \`--fc-fit\` は計算値なので常にインライン
- 角度: 1 枚あたり \`step = spread / min(枚数 − 1, maxVisible × 2)\`。アクティブから o 枚離れたカードは \`o × step + sign(o) × min(|o|, 1) × step × 0.45\`（アクティブの両脇だけ少し隙間を開ける）
- 浮き上がり: \`lift × max(0, 1 − |o|)\`。ホバー中のカードは +14px（マウスのみ）
- 各カードの transform は \`rotate(θ) translateY(−浮き上がり)\`、\`transform-origin: 50% calc(50% + var(--fc-radius))\`
- 外枠: 表示中の全カードの四隅を回転軸まわりに回して境界を求め（props だけから計算）、ステージの高さにする。親の幅より広ければ \`scale(fit)\` で縮める
- 重なり順: アクティブに近いほど前（\`1000 − round(|o| × 10)\`）。奥行きはカード上の暗幕 \`#07050b\` の opacity \`min(|o| × 0.12, 0.6)\`。\`maxVisible\` を超える 1 枚はフェードアウト
- 既定のカード: 角丸 14px、\`image\` を背景に（無ければ黄金角で色相をずらしたグラデーション）、フィルムグレイン（SVG \`feTurbulence\`、opacity .22、overlay）、アクセント色の二重の細枠（内側 7px と 10px）、上部中央に \`01\` の番号、下部にグラデーションの帯と subtitle（9px・大文字・字間 .22em・アクセント色）+ title（16px / 650）、斜めの光沢
- アクティブ: アクセント色のグラデーションの縁取りと発光（別レイヤーの opacity を切り替え）、光沢を強める
- 操作: 下に丸いガラスの前 / 次ボタン（38px、端では無効）と \`03 / 09\` のカウンター

### モーション
- ドラッグ: ステージで pointer を拾い、6px 動いたらドラッグ開始（キャプチャ）。\`target = 開始位置 − dx / 1 枚あたりの px\`（隣のカード中心間の弧の長さを 48px〜カード幅に丸め、fit を掛ける）。両端の外はラバーバンド（0.35 倍）。離したら直近 100ms の速度を 160ms 先まで投影して一番近いカードに確定
- ホイール: 横方向のみ（\`|deltaX| > |deltaY|\`）、140ms 止まったら一番近いカードに確定
- クリックしたカードがアクティブに。キーボードは ← / → / Home / End
- 配るイントロ: \`dealIn\` のとき、最初は山札（各カード deterministic な ±3° の傾き、64px 下）。ルートが 35% 見えたら、アクティブのカードから外側へ 0.07s ずつずらしてバネで扇の位置へ飛んでいく（一度だけ。\`dealIn\` をオンにし直すと再度）
- \`<MotionConfig reducedMotion="user">\` で包み、さらに \`useReducedMotion()\` のときはバネを使わず即時移動、配る演出なし、ホバーも即時

### アクセシビリティ
- ルートは \`<section aria-roledescription="カルーセル" aria-label>\`。キー操作はルートで受ける
- 各カードは \`role="group" aria-roledescription="スライド" aria-label="n / 全体：タイトル"\`。アクティブだけ \`tabIndex={0}\`、他は \`-1\`。\`maxVisible\` の外のカードは \`aria-hidden\` + \`inert\`
- カードにフォーカスがあるときに矢印キーで送ったら、新しいアクティブのカードへフォーカスを移す（それ以外やマウント時は動かさない）
- ボタンは \`aria-label\`（前のカード / 次のカード）、\`:focus-visible\` は白 2px アウトライン
- 視覚的に隠した \`aria-live="polite"\` 領域で、ボタン・キー操作のときに「n / 全体：タイトル」を読み上げる
- \`alt\` があるアートは \`role="img"\` で読み上げ、無ければ装飾として隠す

### 受け入れ条件
- 静止状態で手札のように弧を描いて広がり、中央のカードが浮き上がってまっすぐ立つ
- ドラッグで指に吸い付くようにバネで追従し、離すと勢いを考慮して近いカードに止まる。両端では引っ張るほど重くなる
- 隣のカードをクリックするとそれが浮き上がり、ホバーでわずかに覗く（タッチ端末では覗かない）
- 画面に入ると山札から扇へ配られる。動きを減らす設定では最初から扇
- 狭い親では扇全体が縮小して収まり、スマホで縦スクロールが妨げられない
`;
