/**
 * Prompt material for SwipeCardStack (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same stack from scratch.
 */

export const setup = `
1. スタックを置くコンポーネントを \`"use client"\` にして \`<SwipeCardStack items={[…]} aria-label="お客様の声" />\` を描画する。\`onSwipe\` / \`renderCard\` は関数なので、Server Component から props として渡すことはできない（items だけなら Server Component から渡せる）。
2. \`items\` は \`{ id, title, subtitle?, body?, image?, accent? }\` の配列。\`id\` は一意にする。\`image\` は \`linear-gradient(…)\` などの CSS グラデーションか画像 URL（URL は \`background-image\` として表示されるので、\`next/image\` の最適化は効かない。大きな画像は事前に縮小しておく）。
3. 大きさは CSS 変数で変える: ラッパーに \`[--scs-card-width:360px] [--scs-card-height:440px]\` のようなクラスを付けるか、\`className\` で \`--scs-card-width\` / \`--scs-card-height\` を上書きする。幅は親を超えない（\`max-width: 100%\`）。
4. スタックの下には後ろのカードが覗く余白（\`(visibleCount - 1) × 14px\`）と操作ボタンが入る。高さが決まった枠に置くなら \`カード高さ + 余白 + 約 80px\` を確保する。
5. カードは横に飛んでいくので、**祖先要素に \`overflow: hidden\` があると枠の端で切れる**。切りたくない場合は祖先を \`overflow: visible\` にする（逆に、セクション内で切りたいならそのままでよい）。
6. スワイプ結果を保存するなら \`onSwipe={(item, direction) => …}\` を使う。\`direction\` は \`"left"\`（スキップ）/ \`"right"\`（いいね）。戻る（undo）では呼ばれない。
7. \`loop={false}\` のとき、最後までめくると \`endSlot\` が表示される（未指定なら「すべて見ました」+「最初から」ボタン）。
8. \`npm run build\` が通ることを確認し、「ドラッグで傾きながら飛ぶ」「しきい値未満で離すとバネで戻る」「ボタンと ← / → キーで同じ動き」「スマホで縦スクロールが妨げられない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ループ時にカードが一瞬消える / 飛んだカードが戻ってくる | key に \`item.id\` を使っている（飛んでいくカードと山の一番下に戻るカードが同じ key になる） | key は山の中の通し位置（増え続ける数値）を使う。表示枚数も \`items.length\` を超えない |
| ボタンで飛ばすと逆方向に飛ぶ / 方向が古い | 退場中の要素の props は削除時点で固定される | 方向は \`AnimatePresence custom={…}\` から渡し、\`exit\` は variant 関数で受け取る |
| 離した瞬間に中央へ戻ってから飛ぶ | \`dragConstraints={{ left: 0, right: 0 }}\` で自動的にスナップバックしている | 制約を付けず \`dragMomentum={false}\`、しきい値未満のときだけ \`animate(x, 0)\` で戻す。飛ぶ動きは外側レイヤーの x に加算する |
| 飛んでいくカードが次のカードの下に潜る | 退場中の要素は DOM 上の位置が変わらず z-index が並ぶ | 退場 variant に \`zIndex: 100\` を入れる |
| スマホで縦スクロールできない | カードがすべてのタッチを奪っている | カードの \`touch-action: pan-y\` を外さない |
| 視差効果オフでもカードが飛ぶ | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` を外さない。退場に opacity を含めているので、動きを減らす設定ではフェードになる |
| フックのエラー | \`useMotionValue\` / \`useTransform\` を \`items.map\` の中で呼んでいる | カードは子コンポーネント（\`StackCard\`）に分け、フックはその中で呼ぶ |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/swipe-card-stack/SwipeCardStack.tsx\`（\`"use client"\`）+ \`SwipeCardStack.module.css\` + \`index.ts\`
- props: \`items\`（\`{ id, title, subtitle?, body?, image?, accent? }[]\`）、\`loop = true\`、\`visibleCount = 3\`（1〜4 に丸める）、\`threshold = 120\`（px）、\`rotateFactor = 6\`（100px あたりの度数）、\`showStamps = true\`、\`showControls = true\`、\`likeLabel = "LIKE"\`、\`nopeLabel = "NOPE"\`、\`onSwipe?(item, direction)\`、\`renderCard?(item, { index, total, isTop })\`、\`endSlot?\`、\`springStiffness = 320\`、\`springDamping = 30\`、\`className\`、\`aria-label\`
- 状態: 一番上のカードの通し位置 \`index\`（ループ時は増え続け、アイテムは \`items[index mod n]\`）と、undo 用の方向履歴（最大 50 件）

### 見た目
- CSS 変数（ルートが既定値を持ち、既定と違う値だけインライン）: \`--scs-card-width: 300px\`、\`--scs-card-height: 380px\`、\`--scs-depth-room: 28px\`、\`--scs-radius: 24px\`、\`--scs-surface: #141416\`、\`--scs-accent: #a78bfa\`、\`--scs-like: #4ade80\`、\`--scs-nope: #fb7185\`
- ルート: 縦 flex・中央揃え・gap 22px。スタック: \`width: var(--scs-card-width); max-width: 100%; height: var(--scs-card-height)\`、下に \`--scs-depth-room\` の余白（後ろのカードが覗く分）
- 重なり: 表示枚数 + 1 枚（見えない待機カード）を描画し、深さ d のカードは \`y = 14d px\`、\`scale = 1 − 0.055d\`、傾き \`[0, −2.6, 2.2, −1.6]°\`、\`transform-origin: 50% 100%\`（下端基準なので下に覗く）。待機カードは opacity 0。後ろのカードほど暗い（黒 \`#050506\` の幕を opacity \`min(0.22d, 0.6)\`）
- カード: 角丸 24px、\`overflow: hidden\`、面 \`--scs-surface\` + 上から白 4.5% のグラデーション、\`inset 0 0 0 1px 白 .08\` / \`inset 0 1px 0 白 .10\` / \`0 24px 48px −12px 黒 .6\`
- 既定のカード: 上 40% がアート（\`image\` を背景に、無ければアクセント色の放射グラデーション）。アートにはフィルムグレイン（SVG \`feTurbulence\`、opacity .22、overlay）と下端を面の色へ溶かすグラデーション。左上に \`01 / 05\` の等幅チップ（ガラス、\`backdrop-filter: blur(8px)\` unprefixed のみ）、アート下端にアクセント色の大きな引用符（Georgia 84px、発光）
- 本文: 14.5px / 行間 1.75 / 白 .86、5 行で省略。下に区切り線と人物行（頭文字のアバター 34px、アクセント色グラデーション + 二重リング、名前 14px / 600、肩書 12px / 白 .5）
- スタンプ: 上 26px、2.5px の枠・角丸 10px・22px / 800・字間 .12em、半透明の黒 + ぼかし、同色の発光。LIKE は左上で −14°、NOPE は右上で 14°
- 操作ボタン: 戻る 42px（控えめ）、スキップ 54px（ガラス、ホバーで NOPE 色）、いいね 54px（白いグラデーション、ホバーでハートが赤）。押下 \`scale(.94)\`、無効時 opacity .35

### モーション
- カードは 2 層: 外側 = 山の中の姿勢（y / scale / 傾き / opacity）と退場、内側 = ドラッグの x。傾き \`(外側x + 内側x) / 100 × rotateFactor\`、LIKE の opacity は合計 x が \`threshold × 0.2 → threshold\` で 0 → 1（NOPE は左右反転）
- ドラッグ: \`drag="x"\`、制約なし、\`dragMomentum={false}\`。離したとき \`|x| > threshold\`、または同じ向きに \`|速度| > 600px/s\` なら飛ばす。それ以外はバネ（\`springStiffness\` / \`springDamping\`）で 0 に戻す
- 飛ばす: \`AnimatePresence custom={move} initial={false}\`、退場 variant が外側 x を \`±(コンテナ幅/2 + カード幅 + 40px)\` まで動かす（\`0.28〜0.5s\`、速く振るほど短い、ease \`[.32,.72,0,1]\`）。opacity は後半 55% でフェード、\`zIndex: 100\`。後ろのカードはバネで一段ずつせり上がり、待機カードがフェードイン
- 戻る: 最後に飛ばした方向の画面外から opacity 0 で入ってきて一番上に戻る。履歴が無いとき（ループ時）は左から
- ボタン・← / → キーはドラッグと同じ関数を呼ぶので、傾き・スタンプも同じように出る
- \`<MotionConfig reducedMotion="user">\` で包む（transform は即時、フェードは残る）

### アクセシビリティ
- ルートは \`<section aria-roledescription="カードスタック" aria-label>\`（名前付き section = region）。キー操作はルートで受ける（← スキップ / → いいね）
- 一番上のカードだけ \`role="group" aria-roledescription="カード" aria-label="名前（n / 全体）" tabIndex={0}\`。後ろのカードは \`aria-hidden\` + \`inert\`
- フォーカスのあるカードを飛ばしたら新しい一番上のカードへフォーカスを移す（それ以外ではフォーカスを動かさない。マウント時も動かさない）
- ボタンは \`aria-label\`（前のカードに戻る / スキップ / いいね）、\`:focus-visible\` は白 2px アウトライン
- 視覚的に隠した \`aria-live="polite"\` 領域で「n / 全体」を読み上げ、ループなしで最後まで行ったら「すべてのカードを見ました」

### 受け入れ条件
- 静止状態で後ろのカードが下にずれて覗き、立体的な山に見える
- ドラッグ方向に傾き、スタンプが浮かび、しきい値を超えて離すとその位置から自然に飛んでいく。未満ならバネで戻る
- ボタン・矢印キーでも同じ演出で飛び、戻るで直前のカードが飛んだ方向から戻ってくる
- ループ時は無限にめくれ、ループなしでは終了表示が出る
- スマホで縦スクロールが妨げられない
`;
