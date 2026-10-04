/**
 * Prompt material for ParallaxSlider (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same slider from scratch.
 */

export const setup = `
1. ページ（Server Component のままで可）に \`<ParallaxSlider items={slides} aria-label="…" />\` を置く。コンポーネント自体が \`"use client"\` なので、items がシリアライズ可能（関数を含まない）ならサーバーから渡せる。\`renderItem\` / \`onIndexChange\` を使う場合は呼び出し側も Client Component にする。
2. **高さは親（または className）で決める**。例: \`className="h-[80svh] min-h-[520px]"\`。未指定なら幅 100% の 16:9。ビューポート単位で中身を組んでいないので、カードやモーダルの中に置いても崩れない。
3. \`items\` は \`{ id?, eyebrow?, title?, subtitle?, image?, alt?, cta?: { label, href } }[]\`。\`image\` は画像 URL か CSS の background 値（\`linear-gradient(…)\`、\`url(…)\`、重ね指定も可）。写真に意味があるなら \`alt\` を書く（装飾なら省略）。
4. 写真の代わりに \`<img>\` / \`<video>\` / SVG を出したい場合は \`renderItem={(item, { index, total, isActive }) => …}\`。戻り値は背景アートの層に入り、パララックス・Ken Burns・カーテンの演出とキャプションはそのまま効く。動画は \`muted loop playsInline\` を付け、\`isActive\` のときだけ再生すると軽い。
5. 外から操作する場合は \`index\` + \`onIndexChange\`（制御）、初期位置だけなら \`defaultIndex\`。
6. ページの最初に置くヒーローなら、最初のスライドの画像を \`<link rel="preload" as="image">\` などで先読みすると LCP が安定する。
7. \`npm run build\` が通ることを確認し、実機で「縦スクロールが邪魔されない」「素早いスワイプで 1 枚進む」「CTA をタップするとリンクに飛ぶ」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| スマホで縦スクロールできない | ルートの \`touch-action\` を \`none\` にした | **\`touch-action: pan-y\` のまま**。横ドラッグだけをコンポーネントが拾う |
| CTA をタップしても飛ばない | 押した瞬間に \`setPointerCapture\` している | キャプチャは 6px 動いて横ドラッグと判定してから。ドラッグ後のクリックだけを \`onClickCapture\` で握りつぶす |
| 指定した高さが無視される / 幅が縮む | ルートの \`width: 100%\` を消した | \`aspect-ratio\` は高さだけ指定されると幅を逆算するので、\`width: 100%\` は残す |
| ドラッグ中にカクつく | 位置を React state で持った | 位置は \`useMotionValue\` 1 本。各スライドの transform / opacity / clip-path は \`useTransform\` で読み出すだけ |
| 戻ってきたキャプションが一瞬だけ出る | 切り替え完了をアニメーションの Promise で待った | 停止されたアニメーションでも解決するため、\`onComplete\` で表示する |
| 前へ / 次へのぼかしが Chrome で効かない | \`backdrop-filter\` と \`-webkit-backdrop-filter\` を併記した | **unprefixed だけ書く**（ビルドで自動付与） |
| 視差効果を減らす設定でも動く | framer の \`animate()\` に MotionConfig は効かない | 同梱の \`usePrefersReducedMotion\`（\`useSyncExternalStore\` + \`matchMedia\`）で位置を即時セットし、自動再生と Ken Burns を止める実装を外さない |
| 視差効果を減らす設定の端末でハイドレーションエラー | framer の \`useReducedMotion()\` は初回クライアント描画で実際の値を返し、サーバーの HTML（一時停止ボタン等）と食い違う | サーバー値 \`false\` で水和してから追従する \`useSyncExternalStore\` 版を使う |
`;

export const spec = `
### 前提
- React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）、\`lucide-react\`
- ファイル: \`components/parallax-slider/ParallaxSlider.tsx\`（\`"use client"\`）+ \`ParallaxSlider.module.css\` + \`index.ts\`
- Props: \`items\`（必須）、\`transition\`（\`"parallax" | "fade-zoom" | "curtain"\`、既定 parallax）、\`parallax\`（0–1、既定 0.6）、\`autoplay\`（既定 true）、\`interval\`（ms、既定 6000）、\`loop\`（既定 true）、\`showProgress\` / \`showCounter\`（既定 true）、\`index\` / \`defaultIndex\` / \`onIndexChange\`、\`renderItem\`、\`className\`、\`aria-label\`

### 見た目
- ルート: \`width: 100%; aspect-ratio: 16/9; min-height: 280px; overflow: hidden; container-type: inline-size\`、背景 \`#07070a\`。スライドは全面（\`position: absolute; inset: 0\`）
- 背景アート: \`image\` を \`background\` に（\`cover\` / \`center\`）。下に向かって暗くなるスクリム（左下の放射 + 下からの線形 黒 .55 → 透明 46%）で文字とボタンを読みやすくする
- グレイン: SVG \`feTurbulence\` のノイズを \`mix-blend-mode: overlay\`、不透明度 .09 で全体に重ね、グラデーションのバンディングを消す
- キャプション（左下、HUD の上）: 最大幅 \`min(680px, 64cqi)\`、縦並び gap 14px
  - eyebrow: 12px / 500 / \`letter-spacing: .24em\` / 大文字、先頭に 28×1px の線
  - タイトル: \`clamp(30px, 7.4cqi, 96px)\` / 600 / 行間 1.04 / \`letter-spacing: -.025em\` / \`text-wrap: balance\`。\`h2\` が \`overflow: hidden\` のマスクになる
  - 本文: \`clamp(14px, 1.9cqi, 17px)\` / 行間 1.65 / 白 .8 / 最大 44ch
  - CTA: 高さ 44px の白いピル、黒文字 14px / 600、右に lucide \`ArrowUpRight\`（ホバーで右上に 2px）
- HUD（下端、余白 \`clamp(16px, 4.5cqi, 44px)\`）
  - 左: \`02 / 05\`（13px、tabular-nums、現在値は白 600・総数は白 .62）。数字は切り替え時に下から上へロール。その下に幅 \`clamp(96px, 22cqi, 180px)\`・高さ 2px のプログレスライン（トラック白 .2、塗り白 + 淡いグロー、\`transform-origin: left\` の \`scaleX\`）
  - 右: 46px の円ボタン（前へ / 次へ、自動再生中は一時停止 / 再開も）。白 .08 + \`inset\` の白 1px 縁 + \`backdrop-filter: blur(14px) saturate(160%)\`。無効時は不透明度 .35
- コンテナ幅 560px 以下: 本文 2 行で省略、ボタン 40px、CTA 40px

### モーション
- 連続値 \`pos\`（スライド番号の実数、ループ時は無限）を motion value 1 本で持つ。スライド i のオフセット \`o = i − pos\`（ループ時は最短側に折り返す）。|o| ≥ 1 のスライドは \`visibility: hidden\`
- **parallax**: スライドは \`x = o × 100%\`、背景アートは逆向きに \`x = −o × parallax × 100%\`（＝スライドの (1 − parallax) 倍の速さで動く。フレームが切り抜くので拡大不要）。離れていくスライドに黒の陰影 \`|o| × .55\`
- **fade-zoom**: 右側（o > 0）のスライドが上に重なり \`opacity = 1 − o\` で現れる（中間で暗くならない）。アクティブな背景は \`scale 1 → 1.1\` を \`interval + 2s\` かけて linear で（Ken Burns）。外れた背景はフェードし終わってから 1 に戻す
- **curtain**: 右のスライドは \`clip-path: inset(0 0 0 o×100%)\`、左は \`inset(0 −o×100% 0 0)\` で 2 枚が画面を分け合い、境界が横切る。現れる背景は \`scale 1.14 → 1\`。境界に 2px の白く光る線
- ボタン / キー / 自動再生: tween（parallax 0.95s \`[.65,.05,.25,1]\`、fade-zoom 1.1s \`[.4,0,.2,1]\`、curtain 1.05s \`[.76,0,.24,1]\`）
- ドラッグ: 6px 動いた時点で縦横を判定し、横ならポインターをキャプチャして \`pos = 開始位置 − dx / 幅\`。ループなしの両端はゴムのように .32 倍。離した速度が .35px/ms を超えれば向きに 1 枚、そうでなければ移動量 22% 超で 1 枚、それ以外は戻る。スプリング \`stiffness 210 / damping 30\` に離した速度を引き継ぐ
- キャプション: 切り替え開始で逆順に素早く隠し（.22s）、スライドが止まってから eyebrow → タイトル → 本文 → CTA を 0.09s 間隔で表示（不透明度 + \`y: 18px → 0\`、タイトルはマスク内で \`y: 108% → 0\`、\`[.22,1,.36,1]\`）
- 自動再生: プログレスを 0 → 1 に linear で進め、満ちたら次へ。ホバー・キーボードフォーカス・画面の 25% 未満しか見えない・タブ非表示・ドラッグ中・一時停止ボタン・（ループなしで）最後のスライドでは、その位置で止まって再開時に続きから進む。自動再生オフではラインが \`(現在 + 1) / 総数\` の位置インジケーターになる
- \`<MotionConfig reducedMotion="user">\` で包み、さらに \`matchMedia("(prefers-reduced-motion: reduce)")\`（\`useSyncExternalStore\`、サーバー値 false）が true なら位置は即時に切り替え、自動再生と Ken Burns をオフ

### アクセシビリティ
- ルートは \`<section aria-roledescription="カルーセル" aria-label>\`、\`tabIndex={0}\`。← / → で前後、Home / End で先頭 / 末尾
- 各スライドは \`role="group" aria-roledescription="スライド" aria-label="n / 総数"\`。現在以外は \`aria-hidden\` + \`inert\`（中の CTA にタブで入らない）
- ボタン・キー操作での切り替えは \`aria-live="polite"\` の非表示領域で「n / 総数：タイトル」を読み上げる（自動再生では読み上げない）
- 前へ / 次へ / 一時停止は \`aria-label\` 付きの \`<button>\`（一時停止は \`aria-pressed\`）。カウンターとプログレスは装飾として \`aria-hidden\`
- \`:focus-visible\` で白 2px のリング。マウスのクリックでは自動再生を止めない（キーボードフォーカスのときだけ止める）

### 受け入れ条件
- 横にドラッグすると背景がスライドより遅れて動き、素早く振ると距離が短くても 1 枚進む。縦スワイプではページがスクロールする
- 止まった後にキャプションが順番に立ち上がる。CTA はタップでリンクに飛び、ドラッグの終わりでは飛ばない
- 3 種類の切り替えがいずれも途中で背景色が透けたり、隙間ができたりしない
- 自動再生のラインはホバー・フォーカス・画面外で止まり、戻ると続きから満ちる
- 高さを親で指定しても、指定しなくても（16:9）崩れない
`;
