/**
 * Prompt material for TextReveal (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same effect from scratch.
 */

export const setup = `
1. 見出しなら \`<TextReveal as="h1" text="…" />\` のように \`as\` で正しいタグを指定する（\`h1\` / \`h2\` / \`h3\` / \`p\`、既定 \`h2\`）。改行させたい位置には \`\\n\` を入れる（\`text={"動きで、伝わる。\\nMotion that speaks."}\`）。
2. 文字サイズ・太さ・色・字間・行間は**親要素か \`className\` で指定する**。コンポーネントはフォントを継承し、自分ではサイズを持たない。
3. モードを選ぶ: \`"enter"\`（画面に入ったら 1 回、既定）、\`"loop"\`（\`interval\` ms ごとに再生。最初は完成状態で描画される）、\`"scroll"\`（スクロール位置に連動して 20% → 100% で灯る）。
4. \`"scroll"\` をページ全体ではなく内側のスクロール要素の中で使う場合は、その要素の ref を \`scrollContainerRef\` に渡す。渡さないと window のスクロールを見るので、内側をスクロールしても進まない。コンテナには必ず \`position: relative\`（など static 以外）を付ける。
5. \`gradient\` を付けるとテキスト全体に 1 本のグラデーションが流れる。色は CSS 変数 \`--tr-gradient\` を \`className\` / \`style\` で上書きして変える。
6. \`"use client"\` はコンポーネント側に付いているので、Server Component の中に直接置いてよい。
7. \`npm run build\` が通ることを確認し、「OS の視差効果を減らす設定で最終テキストが即表示される」「スクリーンリーダーで本文が 1 回だけ読まれる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| グラデーションが単語ごとに最初から始まる | 各ピースに \`background-clip: text\` を個別に掛けている | ルートの幅・高さを \`--tr-w\` / \`--tr-h\`、各ピースの \`offsetLeft/Top\` を \`--tr-x\` / \`--tr-y\` に書き、全ピースに同じ大きさのグラデーションをずらして敷く（同梱の計測を外さない） |
| グラデーションで g / y の下が欠ける | 背景は要素の箱の中にしか描かれず、行間が詰まると下端がはみ出る | ピースに \`padding\` と同じ量の負の \`margin\` を付けて背景の範囲だけ広げる |
| マスクで行がガタつく・下にずれる | \`overflow: hidden\` の inline-block はベースラインが箱の下端になる | マスクは \`clip-path: inset(…)\`（負の値で少し広げる）で切り抜く |
| スクロール連動が進まない / 常に 20% のまま | \`scrollContainerRef\` の要素が \`position: static\` だと、framer が位置を測る offsetParent の連鎖から外れ、コンテナを通り越して計算される | スクロールコンテナに \`position: relative\` を付ける |
| 英単語の途中で改行される | 1 文字ずつ inline-block にすると、文字の間すべてが改行位置になる | 単語は \`white-space: nowrap\` のグループで包む（同梱の \`tokenize\` を外さない） |
| 行頭に「。」「、」が来る / 「（」が行末に残る | 句読点・括弧を独立したピースにしている | 閉じ側は直前のピースに、開き括弧は次のピースにくっつける |
| ハイドレーションエラー | 日本語の単語分割を \`Intl.Segmenter\` の辞書で行うと、Node とブラウザの ICU 差で結果が変わる | 単語分割は句読点基準のまま。\`Intl.Segmenter\` は書記素（grapheme）分割にだけ使う |
| 視差効果を減らしてもブラーとフェードが動く | \`MotionConfig reducedMotion="user"\` は transform しか止めない | 同梱の reduced-motion 判定で、動きのない静的な \`<span>\` に切り替える処理を外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）
- ファイル: \`components/text-reveal/TextReveal.tsx\`（\`"use client"\`）+ \`TextReveal.module.css\` + \`index.ts\`
- props: \`text\`（必須、\`\\n\` で改行）、\`as\`（\`h1\` / \`h2\` / \`h3\` / \`p\`、既定 \`h2\`）、\`mode\`（\`"enter"\` / \`"scroll"\` / \`"loop"\`、既定 \`"enter"\`）、\`variant\`（\`"blur-up"\` / \`"fade"\` / \`"slide"\` / \`"mask"\`、既定 \`"blur-up"\`）、\`stagger\`（ms、既定 60）、\`duration\`（ms、既定 900）、\`interval\`（ループ周期 ms、既定 4500）、\`split\`（\`"auto"\` / \`"word"\` / \`"char"\`、既定 \`"auto"\`）、\`scrollContainerRef\`、\`gradient\`（既定 false）、\`className\`

### 見た目
- フォント・サイズ・色・行間は親から継承。ルートは \`position: relative\`
- 分割: 書記素（\`Intl.Segmenter\` の grapheme、無ければ \`Array.from\`）単位で走査
  - \`auto\`: 半角の連続（英単語）は 1 単語 = 1 ピース、全角（日本語・CJK）は 1 文字 = 1 ピース
  - \`word\`: 英語は単語、日本語は \`、。，．！？）」』】〉》〕…\` までを 1 フレーズ = 1 ピース
  - \`char\`: 英単語も 1 文字ずつ（ただし単語は nowrap グループで包んで途中改行させない）
  - \`、。，．！？）」』】〉》〕・ー〜…\` は直前のピースに、\`（「『【〈《〔［｛\` は次のピースに連結
- 各ピースは \`display: inline-block; white-space: pre\`。グループは \`white-space: nowrap\`
- \`mask\`: ピースを \`display: inline-block; clip-path: inset(-.25em -.2em -.22em -.2em)\` のラッパーで包む
- \`gradient\`: 既定 \`linear-gradient(100deg, #fff 0%, #efeaff 28%, #b9abff 60%, #7cc8ff 100%)\`（\`--tr-gradient\`）。各ピースは \`color: transparent\` + \`background-clip: text\`、\`background-size: var(--tr-w) var(--tr-h)\`、\`background-position: var(--tr-x) var(--tr-y)\`。\`--tr-w/h\` はルートの \`offsetWidth/Height\`、\`--tr-x/y\` は各ピースの \`-offsetLeft/-offsetTop\`（transform の影響を受けないので、アニメーション中の再計測は不要）。ResizeObserver と \`document.fonts.ready\` で再計測。ピースに \`padding: .14em .06em .22em\` と同量の負の margin を付けて下端の欠けを防ぐ
- \`forced-colors: active\` ではグラデーションを外して \`CanvasText\`

### モーション
- 初期状態 → 最終状態（transform は em 単位でフォントサイズに比例）
  - \`blur-up\`: \`opacity 0, y .35em, blur(8px)\` → \`1, 0, blur(0)\`、ease \`(.22,1,.36,1)\`
  - \`fade\`: \`opacity 0 → 1\`、ease \`(.33,1,.68,1)\`
  - \`slide\`: \`opacity 0, y .9em\` → \`1, 0\`、ease \`(.16,1,.3,1)\`
  - \`mask\`: \`y 135% → 0%\`（不透明度は常に 1）、ease \`(.16,1,.3,1)\`
- ピース i の遅延 \`i × stagger\`、長さ \`duration\`
- **enter**: \`useInView\`（\`once\`、\`margin: 0px 0px -12% 0px\`）で画面に入ったら 1 回
- **loop**: 最初は完成状態で描画 → 1.4 秒静止 → 消える（380ms、ease-in、ほぼ同時）→ 再生 → 静止 → … 再生開始から次の再生開始まで \`interval\`。画面外（\`amount: .2\`）ではタイマーを止める。状態の切り替えはフェーズごとの 1 回だけで、フレームごとの React 更新はしない
- **scroll**: \`useScroll({ target, container: scrollContainerRef, offset: ["start 0.9", "end 0.45"] })\`。ピース i は進捗の区間 \`[s, s + w]\`（\`w = clamp(3 / n, .08, .5)\`、\`s = i / (n − 1) × (1 − w)\`）で不透明度 \`.2 → 1\`。区間が重なるので、カーソルではなく柔らかい波として灯る。\`variant\` / \`stagger\` / \`duration\` は使わない
- 構造（モード・バリアント・分割・テキスト）が変わったらピースを再マウントして初期状態からやり直す
- \`prefers-reduced-motion: reduce\`: アニメーションせず静的な最終テキスト（\`useSyncExternalStore\` で判定。SSR とハイドレーション中は false）。\`<MotionConfig reducedMotion="user">\` でも包む

### アクセシビリティ
- 本文は視覚的に隠した \`<span>\`（\`clip-path: inset(50%)\` 方式）に入れ、アニメーション用のピースの層はまるごと \`aria-hidden\`。\`aria-label\` は \`<p>\` では読まれないので使わない
- 見出しは \`as\` で正しい見出しレベルにする。テキスト自体はフォーカス可能にしない

### 受け入れ条件
- 日本語は 1 文字ずつ、英語は 1 単語ずつ、ブラーが晴れながら浮かび上がる。句読点が単独で動いたり行頭に来たりしない
- \`gradient\` で複数行にまたがっても 1 本のグラデーションとしてつながり、下端が欠けない
- \`"scroll"\` で、スクロールに合わせて単語が 20% から 100% へ順に灯り、戻すと暗くなる。内側のスクロール要素でも \`scrollContainerRef\` で動く
- ループは画面外で止まり、最初の描画で完成テキストが見える
- 視差効果を減らす設定で、最終テキストが即表示される
`;
