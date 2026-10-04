/**
 * Prompt material for ThumbnailCarousel (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same viewer from scratch.
 */

export const setup = `
1. 使う側は \`"use client"\` でなくても構いません（コンポーネント自体が \`"use client"\`）。\`<ThumbnailCarousel items={[…]} aria-label="商品画像" />\` を商品ページのカラムなどに置く。幅は親いっぱい、高さはメイン画像の縦横比（既定 4:3）で決まる。
2. \`items\` は \`{ id?, title?, subtitle?, image?, alt? }\` の配列。\`image\` は画像 URL（\`<img>\` で描画）か CSS の背景値（グラデーション・\`url(…)\`・複数レイヤー）。\`alt\` は必ず入れる（無ければ \`title\` が代わりに読まれる）。\`title\` / \`subtitle\` を入れるとメイン画像の下部にキャプションが出る。商品写真だけ見せたいなら省略する。
3. 正方形の商品写真なら \`className\` で \`--tc-aspect: 1 / 1\` を上書きする（例: CSS Modules / グローバル CSS で \`.gallery { --tc-aspect: 1 / 1; }\`）。角丸・アクセント色も \`--tc-radius\` / \`--tc-accent\` で変えられる。
4. 外部で選択中の番号を使う（カラー選択と同期するなど）場合は \`index\` と \`onIndexChange\` で制御する。初期位置だけなら \`defaultIndex\`。
5. 画像の代わりに独自の中身を出すなら \`renderItem(item, { index, total, active })\`、サムネイルは \`renderThumb\`。\`renderItem\` の中身はホバー拡大の対象になり、キャプションはその上に重なる。
6. Next.js の \`next/image\` を使いたい場合は \`renderItem\` / \`renderThumb\` の中で \`<Image fill sizes="…" />\` を返す（親は \`position: absolute; inset: 0\` の箱）。外部ドメインなら \`next.config\` の \`images.remotePatterns\` も設定する。
7. \`npm run build\` が通ることを確認し、実機で「横スワイプで切り替わり、縦スワイプではページがスクロールする」「サムネイルが多いとき選択中が見える位置にスクロールする」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| サムネイルを押すとページ全体がガクッとスクロールする | 選択中のサムネイルを \`scrollIntoView\` で見せている | サムネイル列の要素に対して \`scrollTo\`（\`offsetLeft\` / \`offsetTop\` から算出）だけを使う。列は \`position: relative\` のまま |
| 左配置でメイン画像が縦に伸びる | 縦並びのサムネイル列が行の高さを決めてしまう | 列の \`contain: size\` と明示幅を外さない（高さはグリッドがメイン画像に合わせる） |
| 選択リングが移動せず瞬間移動する / 列のスクロールでずれる | \`layoutId\` が複数インスタンスで重複、またはスクロール親に \`layoutScroll\` が無い | \`layoutId\` は \`useId\` 由来のまま、サムネイル列の \`motion.div\` の \`layoutScroll\` を外さない |
| ホバー拡大が重い・カクつく | マウス座標を React の state に入れて毎フレーム再描画している | 座標は ref に入れ、rAF で \`--tc-zoom-x/y\` を書くだけにする。state は拡大のオン / オフ切り替え時だけ |
| スマホで縦スクロールできない | メイン画像の \`touch-action\` を \`none\` にした | \`touch-action: pan-y\` のまま（横ドラッグだけをカルーセルが受け取る） |
| 視差効果オフでもスライドする | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`（前へ / 次へのシェブロン）
- ファイル: \`components/thumbnail-carousel/ThumbnailCarousel.tsx\`（\`"use client"\`）+ \`ThumbnailCarousel.module.css\` + \`index.ts\`
- Props: \`items\`、\`index\` / \`defaultIndex\` / \`onIndexChange\`、\`transition\`（\`"slide" | "fade" | "zoom"\`、既定 slide）、\`thumbPosition\`（\`"bottom" | "left"\`）、\`thumbSize\`（px、既定 64）、\`showCounter\`（既定 true）、\`zoomOnHover\`（既定 true）、\`zoomScale\`（既定 2）、\`loop\`（既定 true）、\`autoPlay\` / \`autoPlayInterval\`（既定オフ / 5000ms）、\`renderItem\`、\`renderThumb\`、\`className\`、\`aria-label\`（既定「画像ギャラリー」）
- 寸法はすべてコンテナ基準（vw / vh は使わない）。CSS 変数の既定値はルートクラスに置き、既定と違う値（\`--tc-thumb\`、\`--tc-zoom-scale\`）だけをインラインで渡す

### 見た目（ダーク前提）
- **ルート**: 下配置は縦 flex（サムネイル列を \`order: 1\` でメインの下へ）、左配置は \`grid-template-columns: auto minmax(0, 1fr)\`。メインとサムネイルの見た目の間隔は 12px
- **メイン（ステージ）**: \`aspect-ratio: var(--tc-aspect)\`（既定 \`4 / 3\`）、角丸 20px、\`overflow: hidden\`、背景 \`#111114\` + 上からの淡い白のラジアル。影 \`0 30px 60px -24px rgba(0,0,0,.7)\`。スライドの上に \`::after\` で 1px のヘアライン（白 .08）と上辺のハイライト（白 .10）
- **既定のスライド**: URL は \`<img object-fit: cover>\`、CSS 値は \`background\` にそのまま。\`image\` が無ければ黄金角で色相をずらしたグラデーション
- **キャプション**: 下端に \`rgba(6,6,8,.62) → 透明\` のスクリム、タイトル 15px / 600、サブ 12.5px / 白 .62。拡大中はフェードアウト
- **枚数バッジ**: 右上 14px、ガラスのピル（\`rgba(12,12,14,.5)\` + \`backdrop-filter: blur(12px) saturate(140%)\` + 白 .12 の内側線）、12px の等幅数字「03 / 06」（総数は白 .46）
- **前へ / 次へ**: 左右中央に 38px のガラスの円。普段は透明、ステージのホバー / フォーカス時に表示（タッチ端末では常時表示）。\`loop={false}\` の端では非表示
- **サムネイル**: 正方形 \`--tc-thumb\`、角丸 12px、非選択は opacity .5 + 彩度 .75、ホバーで .85、選択中は 1。列は 10px 間隔、6px の内側余白（リングと光が切れないため）、スクロールバー非表示。下配置は収まるときは中央寄せ（先頭 / 末尾の \`margin-inline: auto\`）、あふれたらスクロール
- **選択リング**: サムネイルの外側 3px、\`0 0 0 2px var(--tc-accent)\` + 同色 55% の 14px の光。\`--tc-accent\` 既定は \`#f5f5f7\`

### モーション
- **切り替え**: \`AnimatePresence\`（\`initial={false}\`、\`custom={direction}\`）で現在のスライドだけをマウント
  - slide: 進む方向から \`x: ±100%\` → 0、出ていく側は反対へ抜けつつ opacity .4。スプリング \`stiffness 300 / damping 34 / mass .9\`
  - fade: 0.4s のクロスフェード（ease \`[.22,1,.36,1]\`）
  - zoom: 入る側 \`scale 1.14 → 1\` + フェードイン、出る側 \`scale .94\` + フェードアウト
  - 方向は前回の index を state に持ち、レンダー中に比較して決める。ループ時の「最後 → 最初」（次へ）は前進扱い
- **スワイプ**: 現在のスライドに \`drag="x"\`、\`dragConstraints={{ left: 0, right: 0 }}\`、\`dragMomentum={false}\`。\`offset.x + velocity.x × 0.2\` がステージ幅の 22% を超えたら前後へ移動。進めない側（\`loop\` オフの端）は \`dragElastic\` を .12 に下げてゴムのように止める
- **選択リング**: 選択中のサムネイルの中に \`motion.span layoutId={useId 由来}\` を置き、スプリング \`stiffness 520 / damping 40\` で滑らせる。サムネイル列は \`motion.div layoutScroll\`
- **列の追従**: index が変わるたび、列の \`scrollTo\` で選択中を中央へ（初回は瞬時、以降は smooth、reduced-motion では瞬時）
- **ホバー拡大**: \`pointerType === "mouse"\` かつボタン未押下のときだけ。座標は ref、rAF で \`getBoundingClientRect\` 比の % を \`--tc-zoom-x/y\` に書き、ズーム層（スライド内の別要素）に \`transform-origin\` + \`scale(var(--tc-zoom-scale))\`（380ms のトランジション）。押下（ドラッグ開始）・ステージ外・前へ / 次へボタンの上では解除
- **自動再生（任意）**: \`autoPlay\` 時のみ。ホバー・フォーカス中・画面外（IntersectionObserver）・タブ非表示・reduced-motion では止まる
- \`<MotionConfig reducedMotion="user">\` で包み、CSS のトランジションも \`prefers-reduced-motion: reduce\` で無効化（拡大自体は効くが瞬時に切り替わる）

### アクセシビリティ
- ルートは \`<section role="region" aria-roledescription="カルーセル" aria-label>\`
- サムネイル列は \`role="tablist"\`（\`aria-orientation\` は配置に合わせる）、各サムネイルは \`<button role="tab" aria-selected aria-controls={パネル id}>\`、名前は「alt（n / 総数）」。ローヴィングフォーカス（選択中だけ \`tabIndex=0\`）、← / →（左配置では ↑ / ↓）・Home / End で移動し、選択がフォーカスに追従。矢印は \`loop\` に関係なく常に回り込む
- メインは \`role="tabpanel" aria-labelledby={選択中のタブ id} tabIndex=0\`。フォーカス中は ← / → / Home / End で切り替え
- スライドは \`role="group" aria-roledescription="スライド" aria-label="n / 総数"\`。退場アニメーション中のスライドは \`aria-hidden\` + \`inert\`
- 前へ / 次へ・スワイプ・メインのキー操作による切り替えは、視覚的に隠した \`aria-live="polite"\` 領域で「n / 総数：タイトル」を読み上げる（自動再生では読み上げない）
- マウント時にフォーカスを奪わない。\`:focus-visible\` はステージ・サムネイルとも内側 2px の \`--tc-accent\` の線

### 受け入れ条件
- サムネイルをクリックするとリングが滑って移動し、メイン画像が選んだ方向から切り替わる
- メイン画像を横にドラッグ / スワイプすると前後へ移動し、縦スワイプではページがスクロールする
- マウスを乗せると、ポインタ位置を中心に拡大され、動かすと拡大位置が追従する（タッチ端末では起きない）
- サムネイルが列に入りきらないとき、選択中が常に見える位置へ列だけがスクロールする（ページは動かない）
- 左配置でもメイン画像の縦横比が崩れず、サムネイル列はメインの高さの中でスクロールする
- キーボードだけで全画像を切り替えられ、スクリーンリーダーで「n / 総数」が分かる
`;
