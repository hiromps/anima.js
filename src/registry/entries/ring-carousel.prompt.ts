/**
 * Prompt material for RingCarousel (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same ring from scratch.
 */

export const setup = `
1. \`"use client"\` のコンポーネント（またはそのままページ）に \`<RingCarousel items={items} aria-label="…" />\` を置く。\`items\` は \`{ id?, title?, subtitle?, image?, alt? }[]\`。\`image\` は画像 URL か CSS の background 値（\`linear-gradient(…)\` / \`url(…)\`）。画像を使う場合は \`alt\` も渡す。
2. 高さは \`height\`（既定 460px、数値は px、\`"100%"\` なども可）で決まる。リングは枚数・カード幅・傾きから投影後の大きさを計算し、その枠に収まるよう自動で縮小される。幅は親いっぱい（100%）。
3. 半径は省略すると「カード幅 × 1.14 ÷ (2·tan(π/枚数))」で隣のカードと重ならない値になる。固定したい場合だけ \`radius\` を渡す。
4. 正面のカードを知りたい場合は \`onIndexChange\`、外から動かす場合は \`index\`（制御）、初期位置だけなら \`defaultIndex\`。自動回転中も正面が変わるたびに呼ばれる。
5. カードの中身を自作するなら \`renderItem={(item, { index, total, active }) => …}\`。角丸・陰影・裏面はそのまま適用される。
6. 背景は暗い面を想定している（床の光 \`glowColor\` が映える）。明るいページに置く場合は親に暗い背景を敷く。
7. \`npm run build\` が通ることを確認し、実機で「横ドラッグで回り、縦スワイプではページがスクロールする」「ホバーでゆっくり止まって正面に収まる」「← / → で 1 枚ずつ進む」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 奥のカードが消える／裏面が見えない／カードが平面に潰れる | \`.scene\` 以下（\`.tilt\` \`.spin\` \`.card\`）に \`overflow: hidden\`・\`opacity\`・\`filter\`・\`isolation\`・\`mask\` などを足すと \`preserve-3d\` が強制的に flat になる | 角丸・クリップ・陰影は **面（\`.face\`）とその子だけ** に付ける。陰影は \`--rc-shade\` を読む \`.shade\` レイヤーの opacity で行う |
| 縦スクロールできない（スマホ） | ルートの \`touch-action\` を \`none\` にした | \`touch-action: pan-y\` のまま。横方向だけをドラッグとして拾っている |
| 回転がカクつく | 毎フレーム React の state を更新している | 回転は rAF ループから \`.spin\` の \`transform\` へ直接書く。state は正面のカードが変わったときだけ |
| リングがはみ出す／小さすぎる | vw/vh でサイズを決めた | 枠の実寸を ResizeObserver で測り \`--rc-fit\` に書く方式を外さない |
| 親が index を返すと回転がガタつく | \`onIndexChange\` で受けた値をそのまま \`index\` に戻すと、自動回転と取り合いになる | 同梱の「最後に通知した index と同じなら無視する」判定を外さない |
| 視差効果を減らす設定でも回り続ける | 自動回転を CSS ではなく JS で動かしている | \`prefers-reduced-motion\` を見て自動回転・慣性・スプリングを止める処理を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。外部依存なし（純粋な CSS 3D + rAF）
- ファイル: \`components/ring-carousel/RingCarousel.tsx\`（\`"use client"\`）+ \`RingCarousel.module.css\` + \`index.ts\`
- props: \`items\`、\`radius?\`、\`cardWidth\`（210）、\`aspect\`（1.32）、\`tilt\`（10deg）、\`autoRotate\`（true）、\`speed\`（10 deg/s）、\`snap\`（true）、\`backfaceVisible\`（true）、\`depthShading\`（0.65）、\`dragSensitivity\`（0.25 deg/px）、\`friction\`（0.95 / 60fps フレーム）、\`floorShadow\`（true）、\`glowColor\`（#8b5cf6）、\`showControls\`（true）、\`height\`（460）、\`index\` / \`defaultIndex\` / \`onIndexChange\`、\`renderItem\`、\`className\`、\`aria-label\`

### 見た目
- 3D 構造: \`.scene\`（幅高さ 0 で枠の中央に置くアンカー、\`perspective = 半径 × 3 + 400px\`、\`transform: translateY(中心補正) scale(fit)\`）→ \`.tilt\`（\`rotateX(-tilt)\`、奥の列が持ち上がる）→ \`.spin\`（\`rotateY(回転)\`）→ \`.card\`（\`rotateY(i × 360/n) translateZ(半径)\`）→ 表面 / 裏面（\`rotateY(180deg)\`）。\`.face\` 以外はすべて \`transform-style: preserve-3d\`
- 正面のカードは遠近で約 1.35 倍、真裏は約 0.8 倍に見える
- fit: 手前カードの上下端・奥カードの上下端・床の手前端・左右端のカードを透視投影して外接矩形を求め、\`min(1, 枠幅 / 幅, 枠高 / 高さ)\` を \`--rc-fit\` に書く（ResizeObserver）
- 既定のカード: 角丸 18px、画像は \`background-size: cover\`、上部に白の反射グラデーション + SVG ノイズのグレイン、下 55% に暗いスクリム。左上に番号チップ（01、ガラス調ピル）、左下にサブタイトル（10px・大文字・字間 .12em・白 62%）とタイトル（16px / 600）
- 裏面: 同じ画像を左右反転し \`saturate(.7) brightness(.55)\`、文字なし。\`backfaceVisible={false}\` では裏面を描かず手前半分だけが見える
- 陰影: カードごとに \`facing = cos(i × step + 回転)\`、\`shade = depthShading × (1 − facing) / 2\` を 1/40 刻みで \`--rc-shade\` に書き、面内の黒い \`.shade\` レイヤーの opacity にする
- 正面カードは glowColor の柔らかいハロー（\`0 26px 60px -22px\`）
- 床: 直径 2.5 × 半径の円を \`translateY(カード高/2 + 18px) rotateX(90deg)\` で寝かせ、中心が黒、外側が glowColor の放射グラデーション。傾きに合わせて楕円に見える
- 下部に操作列（高さ 56px）: 36px の丸いガラスボタン（前 / 次）と「03 — 10」のカウンター（等幅数字）

### モーション
- rAF ループ（時間ベース）。自動回転は \`speed\` deg/s へ時定数 0.45s で指数的に近づき、ホバー（マウスのみ）・キーボードフォーカス中・ドラッグ中・操作後 1.8 秒は 0 へ同じ速さで減速する
- \`snap\` 有効時、ホバーで止まりきったら最寄りのカード面へ収まる
- ドラッグ: 5px 動いてからドラッグ扱い（そこで pointer capture）。\`回転 += dx × dragSensitivity\`、速度は deg/s を指数平滑。離した瞬間 90ms 以上止まっていたら速度 0
- 離したとき: \`snap\` なら慣性で止まる予定位置 \`回転 + v/60 × f/(1−f)\` に最も近い面を目標にし、離した速度を初速とした臨界減衰スプリング（k = 90）で収める。\`snap\` なしなら \`v *= friction^(dt×60)\` で減速
- キー / ボタン: 1 枚ずつ（最短回り）同じスプリングで移動
- 停止中・画面外（IntersectionObserver）ではループ自体を止める
- \`prefers-reduced-motion: reduce\`: 自動回転なし、慣性なし、キー / ボタン / スナップは即座に切り替え

### アクセシビリティ
- ルート: \`<section tabIndex={0} aria-roledescription="カルーセル" aria-label={…}>\`、\`:focus-visible\` で白 2px + glowColor のリング
- 各カード: \`role="group" aria-roledescription="スライド" aria-label="n / total"\`。正面以外は \`aria-hidden\` + \`inert\`
- ← / → で 1 枚、Home / End で先頭 / 末尾（\`preventDefault\` でページスクロールを止める）
- ボタン・キー操作で正面が変わったときだけ \`aria-live="polite"\` の領域に「タイトル — n / total」を読み上げる（自動回転では読み上げない）
- 画像カードは \`alt\` があれば \`role="img" aria-label={alt}\`
- マウスクリックやタッチでフォーカスしても自動回転は止めない（\`:focus-visible\` のときだけ止める）

### 受け入れ条件
- 初回描画から手前のカードが大きく明るく、奥のカードが小さく暗く、裏側が隙間から透けて見える
- 自動でゆっくり回り、ホバーすると滑らかに減速して正面に収まる
- 横ドラッグで回り、勢いよく離すと慣性で回ってからカード面に収まる。縦スワイプではページがスクロールする
- ← / → / ボタンで 1 枚ずつ進み、カウンターと読み上げが更新される
- 枠のサイズを変えてもリングがはみ出さない（vw/vh を使わない）
`;
