/**
 * Prompt material for BorderBeam (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same frame from scratch.
 */

export const setup = `
1. 使いたい場所で \`<BorderBeam onClick={…}>新機能を試す ✦</BorderBeam>\` のようにラベルを \`children\` に渡す。既定は \`<button type="button">\` なので、フォーム送信に使うときだけ \`type="submit"\` を指定する。
2. リンクにするなら \`as="a" href="…"\`（\`target="_blank"\` なら \`rel="noopener noreferrer"\` が自動で付く）。カードや入力欄の「枠」にするなら \`as="div"\` — この場合は余白もボタン用の文字スタイルも付かないので、中身側で padding を持つ。
3. サイズや面の色は CSS 変数で上書きする: \`--bb-padding\`（例 \`0.85em 1.9em\`）、\`--bb-font-size\`（例 \`16px\`）、\`--bb-surface\`（内側の面の色、既定 \`#0c0c10\`）。Tailwind なら \`className="[--bb-font-size:16px] [--bb-padding:0.85em_1.9em]"\`。
4. 背景は暗いページ前提（\`#0a0a0a\` 前後）。明るい背景に置く場合は \`--bb-surface\` を面に合う色にし、\`glowIntensity\` を下げる。
5. 依存パッケージは無し（React と CSS Modules のみ）。\`npm run build\` が通ることを確認し、Chrome / Safari / Firefox でビームが滑らかに回ること、OS の「視差効果を減らす」をオンにすると静止した 2 色リングになることを確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ビームが回らず、1 周ごとにパッと切り替わる | \`@property --bb-angle\` が登録されていない（削除した / \`@media\` の中に入れた）と角度が補間されない | \`@property\` はファイルのトップレベルに置き、\`syntax: "<angle>"\` / \`inherits: false\` を保つ |
| グラデーションは出るが止まったまま | \`conic-gradient(from var(--bb-angle) …)\` をルート要素で宣言した。値がルートで確定し、子のアニメーションが反映されない | グラデーションはアニメーションする要素（\`.beam\` / \`.glow\`）自身で宣言する |
| 別コンポーネントの回転がおかしくなる | \`@property\` はページ全体で共有。\`--angle\` のような汎用名だと他と衝突する | 接頭辞付きの \`--bb-angle\` のまま使う |
| \`className\` の Tailwind で文字サイズや余白が変わらない | Tailwind v4 のユーティリティは \`@layer\` 内にあり、レイヤー外の CSS Modules に必ず負ける | \`--bb-font-size\` / \`--bb-padding\` / \`--bb-surface\` の CSS 変数で渡す（モジュールはこれらをルートで宣言していない） |
| グローが背景の後ろに隠れる / 切れる | ルートの \`isolation: isolate\` を外した、または \`overflow: hidden\` を付けた | ルートは \`isolation: isolate\` を保ち、\`overflow: hidden\` は付けない（クリップは内側のレイヤーだけ） |
| 古い Safari / Firefox で回らない | \`@property\` 非対応。コンポーネントが \`CSS.registerProperty\` の有無を見て \`data-bb-fallback\` を付け、疑似要素の \`transform: rotate\` に切り替える | \`data-bb-fallback\` 系のセレクタと \`container-type: size\` を消さない |
`;

export const spec = `
### 前提
- React 19 + TypeScript、スタイルは CSS Modules のみ（コンポーネント内に Tailwind を使わない）。外部依存なし。\`"use client"\`
- Props: \`as\`（\`"button"\` | \`"a"\` | \`"div"\`、既定 button）、\`children\`、\`colorFrom\`（既定 \`#8b5cf6\`）、\`colorTo\`（既定 \`#22d3ee\`）、\`duration\`（秒、既定 4）、\`borderWidth\`（px、既定 1.5）、\`radius\`（px、既定 999 = ピル）、\`variant\`（\`"beam"\` | \`"rainbow"\` | \`"pulse"\`、既定 beam）、\`glow\`（既定 true）、\`glowIntensity\`（0–1、既定 0.6）、\`shimmer\`（既定 false）、\`className\`、\`style\`、加えて \`onClick\` などの HTML 属性、button 用 \`type\` / \`disabled\`、a 用 \`href\` / \`target\` / \`rel\`
- 既定値は CSS 側（\`--bb-from\` / \`--bb-to\` / \`--bb-duration\` / \`--bb-width\` / \`--bb-radius\` / \`--bb-glow-opacity\` / \`--bb-glow-blur\`）に持ち、既定と異なる値だけインラインの CSS 変数で上書きする

### 見た目
- レイヤー（奥 → 手前）: **グロー**（ビームと同じ背景を \`filter: blur(14px)\`、\`opacity: .6\`、\`z-index: -1\` で外にはみ出す）→ **ビーム**（\`inset: 0\`、角丸でクリップ、背景色 \`rgba(255,255,255,.1)\` のトラック + コニックグラデーション）→ **内側の面**（ルートの \`padding: borderWidth\` で内側に置いた不透明の面。はみ出したビームの帯がそのままリングになる）→ シマー → 中身
- ビーム（beam）: \`conic-gradient(from var(--bb-angle), transparent 0 62%, colorFrom 84%, colorTo 97%, 先端 100%)\`。先端は \`color-mix(in srgb, colorTo 35%, white)\`。先端で終わり 0% を透明で始めるので、進行方向の縁がシャープになる
- レインボー: \`#ff4d6d, #ff9f43, #ffd93d, #4ade80, #22d3ee, #6366f1, #c084fc, #ff4d6d\`（最後 = 最初で継ぎ目なし）。colorFrom / colorTo は使わない
- パルス: \`colorFrom, colorTo, colorFrom\` の全周リング
- 内側の面: \`#0c0c10\`（\`--bb-surface\` で上書き可）+ 上から白 .06 → 0 のグラデーション、\`inset 0 1px 0 白 .08\` のハイライト、SVG の \`feTurbulence\` ノイズを \`opacity .07\` / \`overlay\` で薄く重ねる。角丸は \`radius − borderWidth\`
- button / a: 14px / 500 / 字間 -0.01em、余白 \`0.72em 1.5em\`（\`--bb-padding\` / \`--bb-font-size\` で上書き可）。div は余白 0
- シマー: 105° の帯（透明 → colorTo 22% を混ぜた白 → 透明）が面を左から右へ横切る

### モーション
- \`@property --bb-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false }\` を登録し、ビームとグローで \`--bb-angle: 0 → 360deg\` を \`duration\` 秒・linear・無限ループ
- パルス: グローに \`opacity\`（×0.35 ↔ ×1）と \`scale(.97 ↔ 1.03)\` の呼吸を \`duration × 0.6\` 秒周期で追加
- シマー: \`translateX(-120% → 120%)\` を周期の前半 55% で走らせ、残りは休止（常時流れるとローディング表示に見える）。周期は \`duration × 0.9 + 1.2s\`
- \`@property\` 非対応ブラウザ: \`CSS.registerProperty\` が無ければルートに \`data-bb-fallback\` を付け、\`container-type: size\` のレイヤー内で幅 \`calc(100cqw + 100cqh)\`・正方形の疑似要素に同じグラデーションを敷き、\`transform: rotate\` で回す（幅 + 高さ ≥ 対角線なので四隅が欠けない）
- 画面外では IntersectionObserver でルートに \`data-paused\` を付け、全アニメーションを \`animation-play-state: paused\`。disabled でも停止
- ホバー（\`hover: hover\` のみ）: \`translateY(-1px)\` とグロー ×1.5。押下 \`scale(.98)\`。div はフォーカスが中に入るとグロー ×1.5
- \`prefers-reduced-motion: reduce\`: アニメーションを全て止め、beam / pulse は 135° で静止した colorFrom → colorTo の全周リング、シマーは非表示

### アクセシビリティ
- 実要素は \`<button type="button">\` / \`<a>\` / \`<div>\`。装飾レイヤー（グロー・ビーム・シマー）は \`aria-hidden\`、ラベルは通常のテキストのまま読み上げられる
- \`:focus-visible\` で colorTo の 2px アウトライン（offset 3px）
- \`as="a"\` で disabled のときは \`href\` を外し \`aria-disabled="true"\` / \`tabIndex={-1}\`。button は native の \`disabled\`
- マウント時にフォーカスを奪わない

### 受け入れ条件
- 暗い背景で、光の尾を引くビームがボーダーを一定速度で一周し続け、背後にぼんやりとした発光が付いてくる
- レインボーは継ぎ目なく回り、パルスはグローがゆっくり明滅する
- \`as="div"\` で入力欄やカードを包んでも中身のレイアウトを崩さない
- 視差効果を減らす設定では静止した 2 色リングになり、壊れて見えない
- 画面外に出るとアニメーションが止まる
`;
