/**
 * Prompt material for SnapCarousel (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same carousel from scratch.
 */

export const setup = `
1. 表示したい場所（Server Component でも可。コンポーネント自体が \`"use client"\`）に \`<SnapCarousel items={…} aria-label="おすすめ商品" />\` を置く。\`aria-label\` はページ内で何のカルーセルかが分かる名前にする。
2. \`items\` は \`{ id?, title?, subtitle?, meta?, image?, alt? }[]\`。\`image\` は画像 URL か CSS の background 値（グラデーション可）。URL は \`<img loading="lazy">\` で描画されるので、意味のある画像には \`alt\` を付ける。並べ替えや追加がある場合は \`id\` を渡す（React の key になる）。
3. 幅は**親コンテナ**で決まる（コンテナクエリ）。親が \`display: flex\` の場合は \`min-width: 0\` を付けないとトラックが縮まずページが横にはみ出す。
4. 枚数は \`slidesPerView\`。数値なら「640px 以上での枚数」で、480–639px は最大 2 枚、479px 以下は 1 枚。個別に決めるなら \`{ sm, md, lg }\`。\`peek\`（既定 true）で +0.15 / +0.2 枚のぞく。
5. カードの中身を自作する場合は \`renderItem={(item, state) => …}\`。スライド内の \`<a>\` や \`<button>\` はそのまま使える（マウスドラッグ後のクリックは自動で無効化される）。
6. 現在位置を外で使うなら \`onIndexChange\`、外から動かすなら \`index\`（制御）/ \`defaultIndex\`（初期位置）。index は「スナップ位置」の番号で、\`align="start"\` では先頭に見えているスライド番号と同じ。末尾付近のスライドは最後の位置にまとまるため、位置の数はスライド数より少なくなることがある。
7. \`autoplay\` はホバー・フォーカス中・画面外・タブ非表示で止まり、OS の「視差効果を減らす」では無効。停止 / 再開ボタンが自動で出る（WCAG 2.2.2）。
8. \`npm run build\` が通ることを確認し、実機で「縦スクロールがカルーセル上でも効く」「横スワイプの慣性」「マウスドラッグ後にリンクが開かない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| マウスドラッグがカクつく / 指を離す前にスナップする | ドラッグ中も \`scroll-snap-type\` が有効、または CSS の \`scroll-behavior: smooth\` が scrollLeft の代入を補間している | ドラッグ中は \`data-dragging\` でスナップを外す仕組みと、トラックの \`scroll-behavior: auto\` を残す。スムーズさは JS の \`scrollTo({ behavior })\` 側で付ける |
| ドラッグして離すとカードのリンクが開く | pointerup 直後の click が届いている | 同梱のキャプチャ段階の click 抑止（\`once\` + 0ms で解除）を外さない |
| Chrome で端のフェードが効かない | \`mask-image\` と \`-webkit-mask-image\` を併記すると Next.js（Lightning CSS）が標準側を削ることがある | **unprefixed だけ書く**。\`backdrop-filter\` も同様 |
| フォーカスリングが見えない | トラックにマスクが掛かっていて outline ごと消える | リングはマスクの無い \`.viewport\` の \`::after\` に描く（\`:has(> .track:focus-visible)\`） |
| スマホでカルーセル上の縦スクロールが効かない | \`touch-action: pan-x\` や pointer の \`preventDefault\` を追加した | タッチはネイティブスクロールに任せる。ドラッグ処理は \`pointerType === "mouse"\` のときだけ |
| 枚数がビューポート幅で変わってしまう | \`vw\` やメディアクエリで幅を決めた | ルートの \`container-type: inline-size\` と \`@container\` を使う。サイドバー内やカード内でも正しい枚数になる |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`lucide-react\`（矢印・再生アイコン）。アニメーションライブラリは不要
- ファイル: \`components/snap-carousel/SnapCarousel.tsx\`（\`"use client"\`）+ \`SnapCarousel.module.css\` + \`index.ts\`
- props: \`items\`、\`slidesPerView\`（数値 = lg、または \`{ sm, md, lg }\`、既定 1 / 2 / 3）、\`gap\`（16）、\`peek\`（true）、\`showArrows\`（true）、\`indicator\`（\`"progress" | "dots" | "none"\`、既定 progress）、\`fade\`（true）、\`loop\`（false）、\`autoplay\`（false）、\`interval\`（4500ms）、\`align\`（\`"start" | "center"\`）、\`index\` / \`defaultIndex\` / \`onIndexChange\`、\`renderItem(item, state)\`、\`className\`、\`aria-label\`

### 見た目（ダーク前提）
- 構造: \`section.root\`（\`container-type: inline-size\`）→ \`.viewport\`（相対配置、矢印の基準）→ \`.track\`（横スクローラー）→ \`.slide\` × n、その下に \`.footer\`
- 枚数: \`.viewport\` に \`--sc-spv\` = sm + peek-sm（1 + .15）、\`@container (min-width: 480px)\` で md（2 + .2）、640px 以上で lg（3 + .2）。スライド幅 \`calc((100% - (var(--sc-spv) - 1) * var(--sc-gap)) / var(--sc-spv))\`
- トラック: \`display: flex; gap: var(--sc-gap); overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; padding-block: 6px\`、スライドは \`scroll-snap-align: start\`（center 時は center）
- 既定カード: アート（\`aspect-ratio: 1 / 1\`、角丸 18px、背景 \`#141417\`）+ 下にタイトル行。アートには上部の反射（白 .10 → 透明 38%）と内側 1px の白 .08 のリム、SVG \`feTurbulence\` のフィルムグレイン（opacity .16、\`mix-blend-mode: overlay\`）。ホバーでアートだけ \`scale(1.04)\`（600ms）
- テキスト: タイトル 14px / 500 / 1 行省略、右端に \`meta\`（12px、白 .62、tabular-nums。評価など）、2 行目に \`subtitle\`（13px、白 .60。価格など）
- 端のフェード: \`mask-image: linear-gradient(to right, transparent, #000 var(--sc-fade-start), #000 calc(100% - var(--sc-fade-end)), transparent)\`。先頭にいないときだけ左 56px、末尾にいないときだけ右 56px。\`@property\` で登録した長さなので 300ms で滑らかに出入りする
- 矢印: 40px の円、\`rgba(18,18,22,.62)\` + \`backdrop-filter: blur(14px) saturate(160%)\`、\`inset 0 1px 0 白 .18\` / \`inset 0 0 0 1px 白 .12\` / \`0 8px 24px rgba(0,0,0,.45)\`。左右 10px、縦はアート中央付近（\`50% - 26px\`）。通常は opacity 0 + \`scale(.88)\` + \`pointer-events: none\`、ルートの \`:hover\` / \`:focus-within\` で表示。端では再び消える（フォーカス中は .4）
- プログレスバー: 幅 \`min(240px, 46%)\`・高さ 3px・白 .12 の溝。つまみの幅 = \`clientWidth / scrollWidth\`、位置 = \`scrollLeft / 最大\`。CSS 変数 \`--sc-thumb\` / \`--sc-progress\` で \`translateX\` のみ動かす。白のグラデーション + 淡いグロー
- ドット: 6px、白 .28。現在位置は幅 20px の白いピル（300ms）。ヒット領域は疑似要素で拡張
- フォーカス: トラックはマスクで outline が消えるため、\`.viewport:has(> .track:focus-visible)::after\` に白 2px のリング。ボタン類は \`outline: 2px solid #fff; outline-offset: 2px\`

### モーション
- スクロール自体はネイティブ（タッチの慣性、トラックパッド、ホイール）。JS は \`scroll\` を \`requestAnimationFrame\` で間引いて位置・端・進捗を読むだけで、毎フレームの React 再レンダーはしない
- スナップ位置: 各スライドの \`offsetLeft\`（center は中央合わせ）を \`[0, 最大スクロール]\` にクランプし、2px 以内の重複をまとめたもの。ResizeObserver と props 変更で再計測
- マウスドラッグ: 6px 動いたらドラッグ開始 → pointer capture、\`data-dragging\` でスナップ解除、\`scrollLeft = 開始位置 - dx\`。離したら速度（px/ms、平滑化。離す前に 80ms 止まっていたら 0）× 220ms 先を予測し、最寄りのスナップ位置へ \`scrollTo({ behavior: "smooth" })\`。スクロール位置が目的地に着いたら（保険で 900ms 後に）スナップを戻す。着地前に次のドラッグが始まったら復帰を取り消す（\`scrollend\` は未対応ブラウザやドラッグ自身のスクロールで発火し得るので使わない）。マウス環境ではトラックに \`user-select: none\`。直後の click はキャプチャ段階で 1 回だけ破棄
- ボタン / キー: 1 スナップ位置ずつ。移動中の連打は目的地から数える。\`loop\` なら端で反対側へ巻き戻す（クローンなし）
- 自動再生: 位置が変わるたびに \`interval\` のタイマーを張り直し、末尾では先頭へ。ホバー・フォーカス・画面外（IntersectionObserver）・タブ非表示で停止
- \`prefers-reduced-motion: reduce\`: \`scrollTo\` は \`behavior: "auto"\`、自動再生なし、フェード・ホバー拡大・ボタンのトランジションなし

### アクセシビリティ
- ルート \`<section aria-roledescription="カルーセル" aria-label="…">\`。トラックは \`role="group"\`・\`tabIndex=0\`・「左右の矢印キーで移動できます」を \`aria-describedby\`
- キー: ← / → で 1 位置、Home / End で先頭 / 末尾（トラック自身にフォーカスがあるときだけ）
- 各スライド \`role="group" aria-roledescription="スライド" aria-label="n / 全数"\`。完全に画面外のスライドは \`inert\`（IntersectionObserver、root = トラック）。のぞいているスライドは操作可能のまま
- 矢印は \`aria-label="前へ" / "次へ"\`・\`aria-controls\`。端では \`disabled\` ではなく \`aria-disabled\`（フォーカスが body に落ちない）
- ボタン / キー / ドットでの移動は \`aria-live="polite"\` で「n / 全数」を読み上げ。自動再生中は \`aria-live="off"\`
- 自動再生時は停止 / 再開ボタン（\`aria-label\` が切り替わる）
- プログレスバーは装飾（\`aria-hidden\`）。ドットは \`aria-current\` 付きのボタン

### 受け入れ条件
- 幅 360px で 1.15 枚、520px で 2.2 枚、720px で 3.2 枚（peek あり・既定）。ビューポートではなく親の幅に追従する
- タッチで横スワイプすると慣性で流れてスナップし、カルーセル上で縦スワイプするとページがスクロールする
- マウスでドラッグして離すと最寄りのカードにスナップし、カード内のリンクは開かない。ドラッグせずにクリックすればリンクは開く
- 先頭では「前へ」と左フェードが無く、末尾では「次へ」と右フェードが無い（loop 時は矢印が常に有効）
- プログレスバーがスクロールに追従し、ドット表示では最後の位置まで到達できる
- トラックに Tab で入り ← / → / Home / End で移動でき、フォーカスリングが見える
- 自動再生はホバー・フォーカスで止まり、「視差効果を減らす」設定では動かない
`;
