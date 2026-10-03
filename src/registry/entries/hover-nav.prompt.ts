/**
 * Prompt material for HoverNav (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same nav from scratch.
 */

export const setup = `
1. ヘッダーのコンポーネントを \`"use client"\` にして \`<HoverNav items={[…]} activeHref={pathname} />\` を置く。\`pathname\` は \`usePathname()\`（\`next/navigation\`）の値。\`onNavigate\` は関数なので、Server Component から props として渡すことはできない。
2. 中央寄せのヘッダーなら \`display: grid; grid-template-columns: 1fr auto 1fr\` にしてロゴ / HoverNav / 右側要素を並べる。HoverNav のルートは \`display: flex\` で、自分の幅しか取らない。
3. リンクは素の \`<a>\` なのでフルページ遷移になる。クライアント遷移にするなら \`onNavigate={(item, e) => { e.preventDefault(); router.push(item.href); }}\` を渡す。\`onNavigate\` は CTA のクリックでも呼ばれる（第 1 引数が \`cta\` オブジェクト）。
4. 現在地は \`activeHref\` を優先し、無ければ \`items[].active\` を見る。一致した項目に \`aria-current="page"\` とドット / 下線が付く。下層ページ（\`/docs/intro\` など）でも親を光らせたいなら、\`activeHref\` に一致させたい項目の href を計算して渡す。
5. \`restOnActive\`（既定 true）はホバーしていないときブロブを現在地に置く。Vercel のように「ホバー中だけ出す」なら \`restOnActive={false}\`。
6. \`variant="flat"\` は背景も枠もない。既に背景のあるヘッダーに直接載せるとき用。
7. \`npm run build\` が通ることを確認し、「ホバーでブロブが滑る」「Tab / ← → でフォーカスとブロブが移動する」「スマホではブロブが出ずタップで縮むだけ」「OS の視差効果を減らす設定でブロブが瞬間移動になる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 視差効果を減らす設定でもブロブが滑る | \`animate(motionValue, …)\` は命令的 API で \`MotionConfig\` を読まない | \`useReducedMotion()\` が true のときは \`.jump()\` で瞬間移動させる（\`MotionConfig reducedMotion="user"\` はインジケーター用に残す） |
| ナビを 2 つ置くとインジケーターが行き来する | \`layoutId\` はページ全体で共有される | \`layoutId\` に \`useId()\` を前置する |
| ブロブの位置がずれる（フォント読み込み後・リサイズ後） | 和文 Web フォントは遅れて読み込まれ、ラベル幅が変わる | \`ResizeObserver\` でトラックとリストを監視し、乗っている項目に \`jump\` で合わせ直す |
| ブロブが一瞬左端に出てから移動する | 計測前に表示している | 初期 opacity 0、\`useLayoutEffect\` で計測して位置を \`jump\` してから表示する |
| スマホでブロブがタップした項目に取り残される | タッチでも \`pointerenter\` が発火する | \`pointerType === "touch"\` は無視。文字色の \`:hover\` も \`@media (hover: hover)\` の中だけに書く |
| ホバーのたびに再レンダーされる | ホバー位置を \`useState\` に入れている | 位置は \`useMotionValue\` と ref に持ち、React の state にしない |
| Chrome でバーのぼかしが効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| Server Component から渡すとエラー | \`onNavigate\` は関数でシリアライズできない | HoverNav を描画する親を \`"use client"\` にする |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）。アイコンライブラリは不要（CTA の矢印はインライン SVG）
- ファイル: \`components/hover-nav/HoverNav.tsx\`（\`"use client"\`）+ \`HoverNav.module.css\` + \`index.ts\`
- props: \`items\`（\`{ label, href, active? }[]\`）、\`activeHref?\`、\`variant\`（\`"floating" | "flat"\`、既定 floating）、\`highlightColor\`（既定 \`#ffffff\`）、\`indicator\`（\`"dot" | "underline" | "none"\`、既定 dot）、\`size\`（\`"sm" | "md"\`、既定 md）、\`cta?\`（\`{ label, href }\`）、\`restOnActive\`（既定 true）、\`springStiffness\`（420）/ \`springDamping\`（34）、\`onNavigate?(item, event)\`、\`className\`、\`aria-label\`（既定「メイン」）
- リンクは素の \`<a>\`（\`next/link\` は使わない）

### 見た目
- 構造: \`<nav aria-label>\` > \`.bar\` > [\`.track\`（ブロブ \`<span>\` + \`<ul>\`）, CTA \`<a>\`]。ブロブは \`<ul>\` の兄弟（\`<ul>\` 直下に \`<span>\` は置かない）
- サイズ: md = 項目の高さ 34px・文字 14px・左右 padding 14px・バーの内側余白 5px / sm = 28px・13px・11px・4px
- floating のバー: 角丸 999px、background \`linear-gradient(180deg, 白 .07, 白 .015)\` + \`rgba(14,14,18,.62)\`、\`backdrop-filter: blur(16px) saturate(160%)\`（unprefixed のみ）、box-shadow \`inset 0 0 0 1px 白 .08\` / \`0 1px 2px 黒 .4\` / \`0 14px 40px -10px 黒 .7\`
  - \`::before\` に feTurbulence の SVG ノイズ（opacity .06、overlay）、\`::after\` に上端 1px のリムライト（左右 14% を空けて中央が白 .32、両端は透明）
- flat: 背景・枠・影なし、内側余白 0、ブロブと項目の角丸は 10px
- 項目: 文字 500、色 白 .60 → アクティブ / ホバー / フォーカスで白（color 200ms）。\`white-space: nowrap\`
- ブロブ: 上下いっぱい、角丸 999px、\`linear-gradient(180deg, ハイライト 9%, ハイライト 5%)\`（\`color-mix\` で透過）、\`inset 0 1px 0 ハイライト 12%\` / \`inset 0 0 0 1px ハイライト 7%\`
- インジケーター: dot = 項目下端から 3px（sm 2px）・4px の円、underline = ラベル幅（左右 padding 分を空ける）・下端 1px・高さ 2px。どちらもハイライト色 + \`0 0 10px\` のグロー
- CTA: 項目と同じ高さ、白→\`#e7e7ec\` のグラデーションのピル、文字 \`#0b0b0f\` 600、ラベル右に 14px の矢印 SVG。ホバーで \`brightness(.94)\` と矢印が 2px 右へ
- フォーカスリング: \`outline: 2px solid\` ハイライト 60%、\`outline-offset: -2px\`（トラックが横スクロールで overflow を切るため内側に描く）
- 狭い画面ではトラックが横スクロール（スクロールバー非表示）

### モーション
- ブロブは \`useMotionValue\` の x / width / opacity で動かす（state にしない）。位置は \`link.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft\`、幅は link の幅
- 表示中なら \`animate(x / width, 目標, { type: "spring", stiffness: 420, damping: 34, mass: .8 })\` で滑る。非表示から出るときは位置を \`jump\` して opacity を 160ms でフェードイン（左端から飛んでこない）
- 優先順位: ポインタで乗っている項目 → キーボードフォーカス中の項目 → 現在地（\`restOnActive\`）。どれも無ければ 220ms でフェードアウト
- マウント時は \`useLayoutEffect\` で現在地に置いて即 opacity 1（最初のフレームから表示）。現在地が変わり、ホバー中でなければ新しい現在地へ滑る
- \`pointerenter\`（\`pointerType === "touch"\` は無視）で移動、トラックの \`pointerleave\` で優先順位に従って戻る
- \`focus\` は \`:focus-visible\` に一致するときだけブロブを引き寄せる（Chromium はクリックでもリンクにフォーカスするため）。フォーカスがトラック外に出たら戻る
- インジケーターは \`layoutId\`（\`useId()\` を前置）で現在地の変更に合わせて滑る。角丸は \`style={{ borderRadius: 999 }}\` で framer に補正させる
- タップ / クリック: ラベルを \`:active\` で \`scale(.95)\`（140ms）、CTA は \`scale(.96)\`
- \`ResizeObserver\` でトラックとリストを監視し、乗っている項目に \`jump\` で合わせ直す
- \`prefers-reduced-motion\`: \`useReducedMotion()\` が true ならブロブは \`jump\`（瞬間移動、フェードのみ残る）、インジケーターは \`<MotionConfig reducedMotion="user">\` で瞬時に切り替え、CSS の press scale と矢印の動きも無効

### アクセシビリティ
- \`<nav aria-label="メイン">\` + \`<ul>\` / \`<li>\` / \`<a>\`。全リンクが Tab 順に入る（ロービング tabindex にはしない）
- ← / → でリンク間のフォーカス移動（端でループ）、Home / End で先頭 / 末尾。現在地は変えない
- 現在地のリンクに \`aria-current="page"\`。ブロブとインジケーターは \`aria-hidden\`
- マウント時にフォーカスを奪わない

### 受け入れ条件
- 初期表示（ホバーなし）で現在地の項目にブロブとドットが表示されている
- ホバーで項目間をスプリングで滑り、バーから出ると現在地に戻る（\`restOnActive={false}\` ならフェードアウト）
- Tab / ← → でフォーカスした項目にブロブが移動し、フォーカスリングが見える
- \`onNavigate\` で \`preventDefault()\` すると遷移せず、項目でも CTA でも呼ばれる
- タッチ端末ではブロブが出ず、タップでラベルが縮む
- 視差効果を減らす設定でブロブ・インジケーターが瞬間移動になる
- フォント読み込みやリサイズ後もブロブが項目からずれない
`;
