/**
 * Prompt material for OrbitingIcons (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same visual from scratch.
 */

export const setup = `
1. 連携先を \`rings\` に内側から順に並べる: \`<OrbitingIcons rings={[{ radius: 0.25, speed: 28, items: [{ icon: PenTool, label: "デザイン" }] }]} aria-label="連携サービス">{logo}</OrbitingIcons>\`。リングは 1〜3 本が想定。
2. \`radius\` は **1 以下ならサイズに対する割合**（0.5 で外枠に接する）、1 より大きければ \`size\` 基準の px。\`speed\` は 1 周の秒数、\`reverse: true\` で逆回転。
3. 中央のロゴは \`children\` に渡す（\`<img alt="…">\` や SVG）。アイコン（svg）を直接渡すと円の 42% の大きさになる。
4. アイコンは \`lucide-react\` のコンポーネントをそのまま \`icon\` に渡せる（\`className\` を受け取るアイコンなら他のライブラリでも可）。ロゴ画像などは \`node\` に渡すと \`icon\` より優先される。
5. 配置するだけでよい。幅は \`min(100%, size)\`・正方形で、狭いコンテナでは比率を保って縮む。中央寄せは親側で行う（例: 親に \`display: grid; place-items: center\`）。
6. \`npm run build\` が通ることを確認し、「アイコンが傾かず正立したまま回る」「ホバーで全体が止まる」「OS の視差効果を減らす設定で静止し、アイコンが均等に並ぶ」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 回っているうちにアイコンが傾く | リングとチップの \`animation-duration\` / \`animation-direction\` / \`animation-play-state\` がずれている | チップはリングと同じ \`--oi-duration\`・同じ向きで逆回転させている。一時停止のセレクタもリング・チップ・ビームを必ずまとめて止める |
| 視差効果オフで配置が崩れる / アイコンが重なる | 角度をアニメーションの遅延（負の \`animation-delay\`）で散らしている | 角度は静的な「スポーク」の \`rotate\` に持たせ、チップ側で \`rotate: -角度\` を打ち消す構造を崩さない |
| サイズがウィンドウ幅で変わる / プレビューで巨大になる | 長さを \`vw\` / \`vh\` で指定した | すべてルート幅基準の \`cqi\`。ルートの \`container-type: inline-size\` を外さない |
| 中心がずれて回る | \`transform\` で中央寄せと回転を兼ねている | 中央寄せは \`translate\` プロパティ、回転は \`transform\`（アニメーション）と分けている。まとめない |
| Chrome でグラデーションの軌道線が塗りつぶしの円になる | \`mask-image\` と \`-webkit-mask-image\` を併記すると Next.js（Lightning CSS）が unprefixed を削ることがある | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| スクリーンリーダーが何も読まない / 同じ名前を何度も読む | 軌道レイヤーの \`aria-hidden\` を外した、またはラベル一覧を消した | 動く層は \`aria-hidden\`、連携先の名前は視覚的に隠した \`<ul>\` で 1 回だけ読ませる構造を保つ |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。ランタイム依存なし（アイコンは利用側が \`lucide-react\` などから渡す）
- ファイル: \`components/orbiting-icons/OrbitingIcons.tsx\`（\`"use client"\`、IntersectionObserver のため）+ \`OrbitingIcons.module.css\`
- Props: \`rings: { radius, speed, reverse?, items: { label, icon?, node? }[] }[]\`、\`size\`（既定 420px）、\`centerSize\`（104）、\`chipSize\`（44）、\`showRings\`（true）、\`ringStyle\`（\`"gradient" | "dashed" | "solid"\`、既定 gradient）、\`showBeams\`（true）、\`pauseOnHover\`（true）、\`glowColor\`（\`#8b7bff\`）、\`children\`（中央）、\`className\`、\`aria-label\`
- CSS 変数（接頭辞 \`--oi-\`）の既定値はルートのクラスに置き、既定と異なる値だけインラインで上書きする

### 見た目
- **ルート**: \`width: min(100%, var(--oi-size)); aspect-ratio: 1; container-type: inline-size\`。長さはすべて「サイズに対する割合 × 100cqi」で表すので、画像のように縮む
- **層構成**（奥から）: 環境光 → 中央の光 → リング（軌道線 + スポーク + チップ）→ 中央の円
- **環境光**: ルート全面に \`radial-gradient(発光色 16%, transparent 64%)\`
- **中央の光**: 中央の円の 2.7 倍、\`発光色 62% → 22%（34%）→ transparent（68%）\`、6 秒で \`scale(.92) → 1.06\` を往復
- **軌道線**（リング要素の中、リングと一緒に回る）
  - gradient: 白 .07 の円 + \`conic-gradient\`（140° まで透明 → 300° で発光色 70% → 352° で発光色と白の混色 → 360° で透明）の光の弧。\`mask-image: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))\` で細い帯にする。逆回転のリングは \`scaleX(-1)\` で弧の頭を進行方向に向ける
  - dashed: \`1.5px dashed\` 白 .17 / solid: \`1.5px solid\` 白 .10（ギャラリーで 0.4 倍に縮むので細線にしない）
- **チップ**: 円形、\`radial-gradient(120% 120% at 30% 15%, 白 .15, 白 .02 62%)\` + 不透明の \`#111115\`（軌道線が透けない）、\`inset 0 1px 0 白 .2\` / \`inset 0 0 0 1px 白 .09\` / \`0 8px 22px rgba(0,0,0,.55)\`。アイコンは 46%、線幅 1.75、白 .86。ホバーで白・発光色の縁と外光
- **中央の円**: ダークガラス（\`radial-gradient(100% 100% at 50% 0%, 白 .16, 白 .03 62%)\` + \`#0f0f13\`）、上辺のハイライト、\`0 0 44px 発光色 42%\` の外光、外側 9% に白 .08 の細いリム。\`children\` を中央に配置
- **ビーム**: 中央の円の縁からチップの縁までのトラック（高さ 6px、\`overflow: hidden\`）を、幅 35%・高さ 2px の光の筋（頭が中央側で白 → 発光色 → 透明、\`0 0 6px\` の発光）が走る

### モーション
- 構造: リング（\`transform: rotate(0 → 360deg)\`、\`linear\`、\`speed\` 秒）→ スポーク（静的に \`rotate: 角度\`、長さ = 半径）→ チップのアンカー（静的に \`rotate: -角度\`）→ チップ（\`rotate(0 → -360deg)\`、リングと同じ周期・同じ向き）。回転が打ち消し合い、アイコンは常に正立
- 各リングのアイテムは \`360 / 個数\` 間隔。リングごとに開始角をずらし、放射状に並ばないようにする
- ビーム: 7 秒周期の最初の約 22% で外→中央へ移動し、残りは非表示。各スポークの遅延は黄金比で散らした負の \`animation-delay\` なので「ときどき」走って見える
- \`pauseOnHover\`: ルートのホバーでリング・チップ・ビームの \`animation-play-state\` を**まとめて** paused（片方だけ止めるとアイコンが傾く）。画面外では IntersectionObserver で同様に停止
- \`prefers-reduced-motion: reduce\`: リング・チップ・中央の光のアニメーションを無効、ビームを非表示。角度はスポークにあるので、均等に並んだ静止状態になる

### アクセシビリティ
- 動く軌道レイヤーは丸ごと \`aria-hidden\`（動きに情報はない）。連携先の名前は視覚的に隠した \`<ul>\` に重複を除いて 1 回ずつ出す — \`role="img"\` だと名前が 1 つの文字列に潰れ、中央のロゴの代替テキストも読まれなくなるため、数えて移動できるリストを選んだ
- 中央の \`children\` は隠しレイヤーの外に置き、ロゴの \`alt\` や名前が読めるようにする
- \`aria-label\` を渡すとルートが \`role="group"\` になり、全体に名前が付く
- 各チップに \`title\` を付け、マウス利用者にはホバー（停止中）でラベルを見せる。チップはフォーカス不可（操作要素ではない）

### 受け入れ条件
- 既定で 2 本のリングが逆向きに回り、アイコンが傾かない
- コンテナを 240px まで狭めても比率を保ったまま縮み、はみ出さない（\`vw\` / \`vh\` を使っていない）
- ホバーで全体が止まり、再開時に飛ばない
- 視差効果を減らす設定で静止し、アイコンが各軌道上に均等に並ぶ
- スクリーンリーダーで連携先の名前の一覧と中央のロゴ名が読める
- ランタイムの依存パッケージを追加しない
`;
