/**
 * Prompt material for CoverflowCarousel (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same carousel from scratch.
 */

export const setup = `
1. 使うコンポーネント側で \`items\`（\`{ id?, title?, subtitle?, image?, alt? }[]\`）を用意し、\`<CoverflowCarousel items={items} />\` を置く。\`image\` は画像 URL か CSS の background 値（\`linear-gradient(…)\` など）。画像が無くてもグラデーション＋タイトルの既定スライドで表示される。
2. 幅は親要素いっぱい（\`width: 100%\`）に広がり、スライド幅は \`slideWidth\` とコンテナ幅の 38% の小さい方。親を \`display: flex\` で中央寄せする場合も幅が 0 にならないよう、親に幅を持たせる（コンテナクエリを使っているため、中身の幅では広がらない）。
3. 現在のスライドを外で持ちたい場合は \`index\` と \`onIndexChange\` を組で渡す（制御モード）。\`onIndexChange\` で state を更新しないとスライドが元の位置に戻らないので注意。初期位置だけなら \`defaultIndex\`。
4. 独自の見た目は \`renderItem={(item, { index, active, total }) => …}\` で描画する。映り込みを有効にしていると \`renderItem\` の結果が反転コピー用にもう一度描画される（\`aria-hidden\` + \`inert\`）。動画や重い要素を入れる場合は \`reflection={false}\` を検討する。
5. 画像は \`<img loading="lazy">\` で描画される。Next.js の \`next/image\` を使いたい場合は \`renderItem\` の中で使う。
6. \`npm run build\` が通ることを確認し、実機で「横ドラッグで最寄りにスナップ」「縦スワイプでページがスクロールする」「トラックパッドの横スクロールで送れる」「左右のスライドをクリックで手前に来る」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| スライドがすべて中央に重なる / 幅 0 になる | ルートは \`container-type: inline-size\` なので、shrink-to-fit な親（\`inline-flex\` や幅指定の無い flex アイテム）だと幅が 0 になる | ルートの \`width: 100%\` を外さず、親に幅を与える |
| ドラッグ中にカクつく / React が毎フレーム再レンダリングされる | 位置を state に入れている | 位置はエンジン（\`createEngine\`）が保持し、\`transform\` を要素へ直接書く。state は確定したインデックスだけ |
| 左右のスライドをクリックしても反応しない | ドラッグ開始前に \`setPointerCapture\` している（click の発火先がステージに変わる） | キャプチャは 6px 動いてドラッグと判定してから |
| トラックパッドの横スクロールでブラウザの「戻る」が発動する | React の \`onWheel\` は passive で \`preventDefault\` できない | \`addEventListener("wheel", …, { passive: false })\` を外さない。縦優位のホイールは素通しする |
| ループ時に 9 → 1 枚目で全スライドが逆回転する | 目標をインデックスそのものにしている | 目標は「仮想インデックス」。現在の目標から最も近い同値の位置を選ぶ |
| 端のスライドが反対側へ瞬間移動して見える | ループ時の折り返し位置（±n/2）より手前でフェードしきっていない | \`visibleRange\` で可視範囲を n に応じて狭める |
| 映り込みがステージの外で切れる | \`mask-image\` は要素のボックス外を描画しない | 映り込みはステージの \`padding-bottom\` の中に収める |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。アニメーションライブラリは使わない（純粋な CSS 3D + requestAnimationFrame）
- ファイル: \`components/coverflow-carousel/CoverflowCarousel.tsx\`（\`"use client"\`）+ \`CoverflowCarousel.module.css\` + \`index.ts\`
- Props: \`items\`、\`index\` / \`defaultIndex\` / \`onIndexChange\`、\`rotate\`（55deg）、\`depth\`（220px）、\`spacing\`（0.3 = スライド幅比）、\`slideWidth\`（260px）、\`aspect\`（1）、\`reflection\`（true）、\`autoplay\`（false）+ \`interval\`（3500ms）、\`loop\`（false）、\`showDots\`（true）、\`className\`、\`aria-label\`、\`renderItem(item, { index, active, total })\`

### 見た目
- ルート: \`width: 100%\`、\`container-type: inline-size\`、\`overflow: hidden\`、縦 flex（ステージ → コントロールバー、gap 14px）
- スライド幅 \`--cf-w: min(slideWidth, 38cqw)\`、高さ \`--cf-w × aspect\`。JS で測らないので SSR の初回描画から正しいサイズ
- ステージ: \`perspective: calc(--cf-w × 3.6)\`、左右 11% を \`mask-image\` でフェード。\`touch-action: pan-y\`、\`cursor: grab\`
- 配置（d = スライドの中心からの距離、|d| ≤ 1 で near、それ以降 far）:
  - X = \`sign(d) × (near × (0.55 + spacing) + far × spacing) × --cf-w\`
  - Z = \`-(near × depth + far × depth × 0.15)\`
  - rotateY = \`-sign(d) × near × rotate\`（右側は外側の縁が手前、正面を中央へ向ける）
  - z-index = \`100 − round(|d| × 10)\`、可視範囲（既定 3 枚、ループ時は n に応じて縮小）の外 0.75 枚でフェードアウト
  - 陰影 \`--cf-shade = min(near × 0.42 + far × 0.1, 0.75)\` を面の上に \`rgba(6,5,12,shade)\` で重ねる
- 既定スライド: 角丸 14px、\`background\` にグラデーション（URL なら \`<img object-fit: cover>\`）、左上からの光沢（白 .20 → 0 at 44%）、SVG \`feTurbulence\` のフィルムグレイン（overlay、.16）、下部に黒 .74 → 0 のグラデーションとタイトル（幅 × 0.074、600〜650）/ サブタイトル（幅 × 0.048、白 .66）。縁は \`inset 0 0 0 1px\` 白 .10 + 上辺ハイライト、影 \`0 28px 50px -18px rgba(0,0,0,.75)\`
- 映り込み: スライド直下（3px 空ける）に同じ内容を \`scaleY(-1)\` で複製、\`mask-image: linear-gradient(to bottom, #000, transparent 36%)\`、不透明度 \`0.3 × (1 − shade)\`。\`-webkit-box-reflect\` は使わない
- 床: スライド下端に中央が明るい 1px の水平線（白 .16）と、薄い紫の放射グラデーション
- コントロールバー: すりガラスのピル（白 .06 + \`backdrop-filter: blur(12px)\`）に「‹ ドット ›」。ドットは 6px、現在のものは幅 20px の白ピルへ伸びる（0.4s）

### モーション
- 位置は浮動小数の「スライド単位」。スプリング（質量 1、剛性 210、減衰 26 ≈ ζ0.9）で整数の目標へ。落ち着いたら rAF を止める
- ドラッグ: 6px 以上かつ横優位で開始し、そこで pointer capture。1 枚ぶん = スライド幅 × (0.55 + spacing) × 0.8 px。端ではラバーバンド（0.3 倍）。離したら速度 × 0.16 秒先を四捨五入した位置へ、その速度を引き継いでスプリング
- ホイール: 横優位の \`deltaX\` だけ \`preventDefault\` してスクラブ、140ms 止まったら最寄りへスナップ
- クリック: 側面のスライドをクリックでそのスライドへ（ドラッグ直後のクリックは無視）
- 自動再生: \`interval\` ごとに次へ。ホバー（マウスのみ）・フォーカス中・画面外（IntersectionObserver）・タブ非表示・ドラッグ中は停止。ループ無しなら最後の次は先頭へ戻る
- \`prefers-reduced-motion: reduce\`: スプリングを使わず即座に移動、自動再生はオフ

### アクセシビリティ
- ルート \`<section aria-roledescription="カルーセル" aria-label tabIndex={0}>\`。← / → で前後、Home / End で先頭 / 末尾
- 各スライド \`role="group" aria-roledescription="スライド" aria-label="n / total"\`。正面以外は \`aria-hidden\`、中身は \`inert\`（クリックは受けるがタブ移動では入らない）
- 矢印ボタン \`aria-label="前のスライド" / "次のスライド"\`（ループ無しの端では disabled）、ドットは \`aria-label="n 枚目へ：タイトル"\` + \`aria-current\`
- ユーザー操作での変更は \`aria-live="polite"\` で「n / total：タイトル」を読み上げ（自動再生では読み上げない）
- 映り込みと床は \`aria-hidden\`

### 受け入れ条件
- 初回描画（JS 前）から扇状に並び、正面のスライドの左右に 3 枚ずつ重なって見える
- ドラッグ・フリック・横スクロール・クリック・キーボード・ドットのどれでも、スプリングで滑らかに最寄りのスライドへ止まる
- 縦スワイプでページがスクロールする
- 映り込みが床に向かって自然に消え、奥のスライドほど暗い
- 狭いコンテナでもはみ出さず、スライドが縮む
`;
