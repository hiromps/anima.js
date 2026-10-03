/**
 * Prompt material for BentoGrid (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same grid from scratch.
 */

export const setup = `
1. タイルのデータを \`items\` に渡して置く: \`<BentoGrid items={[{ title: "高速ビルド", description: "…", icon: Zap, span: "2x2" }, …]} aria-label="機能一覧" />\`。\`icon\` はコンポーネント（関数）なので Server Component から Client Component へは渡せない。**BentoGrid を置くファイルを \`"use client"\` にする**か、items を組み立てる小さな Client Component（例: \`FeatureBento.tsx\`）を作ってページから読み込む。
2. \`span\` は \`"1x1" | "2x1" | "1x2" | "2x2"\`（列 × 行）。\`grid-auto-flow: dense\` で隙間を後続のタイルが埋めるので、並び順と span の合計を 4 列で割り切れるように組むと穴なく揃う（デモは 2x2・2x1・1x2・1x1・2x1・1x1 で 3 行）。
3. 列数はコンテナの幅で決まる（ウィンドウ幅ではない）: 640px 以上で \`columns\`（既定 4）、440〜639px で最大 2、440px 未満で 1 列。サイドバーや狭いカラムに置いても自動で崩れる。
4. タイルの色は item ごとの \`accent\`、未指定のタイルはグリッドの \`accent\` prop（既定 #a78bfa）。\`visual\` に任意の ReactNode を渡すと、アイコンと文字の間（2x1 では右半分）にイラスト領域ができ、中から \`var(--bento-accent)\` でタイルの色を参照できる。
5. 行の最小高さや面の色はクラスから CSS 変数で上書きする: \`--bento-row\`（既定 160px）、\`--bento-surface\`（#0c0c0f）、\`--bento-border\`（白 8%）。
6. \`npm run build\` が通ることを確認し、「スクロールで画面に入るとタイルが順にフェードインする」「ホバーで少し浮き、枠線と光がアクセント色になる」「幅を狭めると 4 → 2 → 1 列に崩れ、横スクロールが出ない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 1 列表示で横にはみ出す / 謎の 2 列目ができる | 1 列の grid に \`grid-column: span 2\` が残った | 狭いコンテナクエリと \`columns={1}\`（\`data-single\`）で span を \`auto\` に戻す規則を消さない。上書きするなら \`.cell[data-span]\` 以上の詳細度で |
| ホバーするとタイルがワンテンポ遅れて浮く | 出現の \`transition-delay\` をホバーするタイル自身に付けた | 出現は外側の \`li\`（.cell）、ホバーは内側の .tile に分ける現行構造を維持する |
| ハイドレーション直後に一瞬表示されてから消える | 出現前の非表示を JS（useLayoutEffect 等）で付けた | サーバー HTML に \`data-reveal="pending"\` を出し、CSS は \`@media (scripting: enabled) and (prefers-reduced-motion: no-preference)\` の中だけで隠す |
| 列数が変わらない / ウィンドウ幅で崩れる | \`@media\` や \`vw\` で列数を決めた | \`container: bento / inline-size\` のコンテナクエリで決める。グリッド自身はコンテナにできないので、ルート（section）がコンテナ、子の ul がグリッド |
| Tailwind の \`grid-cols-*\` を付けても効かない | CSS Modules はレイヤー外で、\`@layer utilities\` より強い | 列数は \`columns\` prop で渡す |
| \`Functions cannot be passed directly to Client Components\` エラー | Server Component（page.tsx など）で \`icon: Zap\` を含む items を書いた | items を組み立てるファイルを \`"use client"\` にする |
| スマホでタップしたタイルが光ったまま | \`:hover\` を素で書いた | ホバー効果は \`@media (hover: hover)\` の中に置く |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。依存は \`lucide-react\`（アイコンの型のみ）
- ファイル: \`components/bento-grid/BentoGrid.tsx\`（\`"use client"\`）+ \`BentoGrid.module.css\` + \`index.ts\`
- エクスポート: \`BentoGrid\`（default も同じ）、型 \`BentoGridProps\` / \`BentoItem\` / \`BentoSpan\`
- \`BentoItem\`: \`title\`、\`description?\`、\`icon?: LucideIcon\`、\`span?: "1x1" | "2x1" | "1x2" | "2x2"\`（既定 1x1）、\`visual?: ReactNode\`、\`accent?: string\`
- props: \`items\`、\`columns\`（最大列数 1–6、既定 4）、\`gap\`（12 px）、\`radius\`（20 px）、\`revealOnScroll\`（既定 true）、\`accent\`（既定 #a78bfa、個別 accent のないタイル用）、\`className\`、\`aria-label\`
- 既定値は CSS 変数（接頭辞 \`--bento-\`）でルートクラスに持ち、既定と異なる props だけ inline の style で上書きする。タイルごとの accent は各 li に \`--bento-accent\` として inline で渡す

### 見た目
- **構造**: \`section.root\`（コンテナ）> \`ul.grid\` > \`li.cell\`（グリッドアイテム・出現アニメ）> \`div.tile\`（面・ホバー）> グレイン + \`div.body\`
- **グリッド**: \`repeat(var(--bento-cols), minmax(0, 1fr))\`、\`grid-auto-rows: minmax(var(--bento-row), auto)\`（160px）、\`grid-auto-flow: row dense\`、\`gap: var(--bento-gap)\`
- **span**: \`data-span\` 属性で 2x1 → \`grid-column: span 2\`、1x2 → \`grid-row: span 2\`、2x2 → 両方
- **タイル**: \`border: 1px solid rgba(255,255,255,.08)\`、\`border-radius: var(--bento-radius)\`、背景は「左上からのアクセント光 \`radial-gradient(120% 90% at 0 0, accent 13%, transparent 55%)\`」+「上から白 3.5% → 透明」+ \`#0c0c0f\`。上辺に \`inset 0 1px 0 白 5%\` のハイライト
- **ホバーの光（.tile::before）**: 左上 accent 22% + 右下 accent 9% の放射グラデーション。\`opacity\` 0 → 1 でフェード（グラデーション自体は transition できないため）
- **グレイン**: SVG \`feTurbulence\`（fractalNoise, .9）のデータ URI、\`opacity: .05\`、\`mix-blend-mode: overlay\`
- **中身（.body）**: \`padding: 18px\`、grid-template-areas \`"icon" "visual" "text"\`、行は \`auto minmax(0,1fr) auto\`。visual が無ければ中段は余白で、文字は下端に揃う。2x1 で visual がある場合は \`"icon visual" "text visual"\`（左に文字、右にイラスト）
- **アイコンチップ**: 34px 角、角丸 10px、背景 \`color-mix(accent 14%, 白 2%)\`、\`inset 0 0 0 1px accent 30%\`、アイコン色 \`color-mix(accent 70%, white)\`、lucide 18px / stroke 1.8
- **文字**: タイトル 15px / 600 / #f4f4f5（h3）、説明 13px / 行間 1.55 / 白 56%。システムフォント（-apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI"…）

### レスポンシブ（コンテナクエリ）
- ルートに \`container: bento / inline-size\`
- 639px 以下: \`repeat(var(--bento-cols-md), …)\`（既定 2、\`columns\` が 1 なら 1）。2x2 / 2x1 は 2 列ぶち抜きのまま
- 439px 以下: 1 列。全 span を \`auto\` に、visual 付きタイルは \`min-height: calc(var(--bento-row) * 1.6)\`、2x1 の左右レイアウトも縦積みに戻す
- \`columns={1}\` のときは幅に関係なく span を無効化（\`data-single\`）

### モーション
- **出現**: SSR の時点でルートに \`data-reveal="pending"\`。\`@media (scripting: enabled) and (prefers-reduced-motion: no-preference)\` の中だけで pending の .cell を \`opacity: 0; transform: translateY(18px) scale(.98)\` にする。IntersectionObserver（rootMargin 下 -8%）が最初に交差したら \`data-reveal="shown"\` にして disconnect（一度きり）。各 .cell に \`--bento-i\`（index）を渡し \`transition-delay: min(i, 10) * 70ms\`、\`opacity .6s ease\` / \`transform .7s cubic-bezier(.22,1,.36,1)\`。IntersectionObserver が無い環境では即 shown
- **ホバー**（\`@media (hover: hover)\` のみ）: .tile が \`translateY(-3px)\`、枠線が \`color-mix(accent 45%, 白 10%)\`、::before が opacity 1。\`.35s\`。\`:focus-within\` でも枠線と光（浮き上がりなし）
- 常時アニメーションは無い
- \`prefers-reduced-motion: reduce\`: 出現アニメなしで最初から表示、ホバーの浮き上がりと transition を無効化（色の変化だけ残す）

### アクセシビリティ
- \`section\`（\`aria-label\` で名前付きランドマーク）> \`ul\` / \`li\` のリスト。タイトルは \`h3\`
- アイコンチップとグレインは \`aria-hidden\`。visual の意味づけは利用側に任せる（装飾なら利用側で \`aria-hidden\`）
- タイル自体はフォーカスを取らない。中にリンクがあれば \`:focus-within\` で点灯

### 受け入れ条件
- 4 列・既定のデモで、2x2 / 2x1 / 1x2 / 1x1 が隙間なく 3 行に収まる
- ホバーなしの初回描画でも、各タイルの左上がアクセント色でほんのり色づいている
- スクロールで画面に入るとタイルが順番にフェードインし、二度目以降は再生しない
- コンテナを狭めると 4 → 2 → 1 列になり、横スクロールが出ない
- JS 無効・視差効果を減らす設定では、最初からすべてのタイルが見える
`;
