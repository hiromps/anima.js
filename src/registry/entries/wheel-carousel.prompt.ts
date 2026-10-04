/**
 * Prompt material for WheelCarousel (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same wheel from scratch.
 */

export const setup = `
1. ホイールを置くコンポーネントを \`"use client"\` にして \`<WheelCarousel items={["1月", "2月", …]} aria-label="月" onIndexChange={setMonth} />\` を描画する。\`onIndexChange\` / \`renderItem\` は関数なので Server Component からは渡せない。
2. \`items\` は文字列か \`{ id?, title?, subtitle?, image?, alt? }\` の配列。\`variant="card"\` ではサムネイル（\`image\` は画像 URL か \`linear-gradient(…)\`。URL は \`background-image\` として表示されるので \`next/image\` の最適化は効かない）とタイトル・サブタイトルが出る。
3. 値を外から決めるなら \`index\` + \`onIndexChange\` の制御モード、初期値だけなら \`defaultIndex\`。\`index\` を変えるとホイールはその行まで**回って**移動する（日付ピッカーで月を変えたら日を \`Math.min(day, 日数 - 1)\` に丸めて渡す、など）。
4. 横幅は親に従う（\`width: 100%\`）。複数並べるなら親を \`display: grid\` / \`flex\` にして列幅を決める。各インスタンスは独立しているので、月 / 日 / 時刻 のように並べて \`aria-label\` をそれぞれ付ける。帯の高さを揃えるため、並べるホイールの \`rowHeight\` と \`visibleRows\` は同じにする。
5. 高さは \`rowHeight\` と \`visibleRows\` から自動で決まる（5 行・40px で約 171px）。固定高さの枠に入れる場合はこの値を基準にする。
6. \`loop\` は行数が \`visibleRows + 2\` 以上のときだけ有効（それ未満だと同じ行を 2 回描く必要があるため、端で止まる通常モードになる）。
7. 行数は数十件までを想定（全行を DOM に置く）。数百件以上なら絞り込み UI を併用する。
8. \`npm run build\` が通ることを確認し、「ドラッグして離すと慣性で回って行に吸着する」「ホイール 1 ノッチで 1 行」「トラックパッドで指に追従して止まると吸着」「↑↓ / PageUp / PageDown / Home / End」「行クリックでその行へ回る」「スマホで横方向のスクロールは妨げない」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ホイールを回すとページまでスクロールする | React の \`onWheel\` は passive 登録で \`preventDefault()\` が効かない | \`addEventListener("wheel", …, { passive: false })\` をネイティブで付ける。ループなしで端に達したときだけ素通しにしてページに返す |
| ドラムが平らに見える（ただのリストが上下でフェード） | \`mask-image\` / \`overflow\` / \`filter\` を付けた要素は \`preserve-3d\` が平坦化される | \`perspective\` とマスクはビューポートに付け、行はその**直下の子**に置いて各行の transform に \`translateZ(-r) rotateX(…) translateZ(r)\` をまとめて書く |
| Chrome / Safari でフェードが効かない | \`mask-image\` と \`-webkit-mask-image\` を併記すると Next.js（Lightning CSS）が unprefixed を削る | **unprefixed だけ書く**。プレフィックスはビルド時に自動付与される |
| 回している途中で行が一瞬元の位置に飛ぶ | 行の位置を React の state から描画していて、選択変更の再描画が rAF の書き込みを上書きする | 行の \`--d\` は初回描画の値（一定）だけを JSX に書き、以降は rAF が \`style.setProperty\` で書く。1 フレームごとに setState しない |
| ループ時に裏側の行が前面に回り込んで重なる | 角度ステップ固定の円筒は 360° で一周するので、行数が多いと背面の行が前に来る | \`|d|\` が \`(visibleRows + 2) / 2\`（= 90°）以上の行は \`data-off\` で透明 + \`pointer-events: none\` にして端に寄せる。\`backface-visibility\` だけに頼らない |
| スクリーンリーダーで一部の選択肢しか読めない | 見えない行を \`visibility: hidden\` / \`aria-hidden\` にしている | listbox の option はすべてアクセシビリティツリーに残す。隠すのは opacity だけ |
| 回転後に値が二重に読み上げられる | キー操作で \`aria-activedescendant\` と live region の両方が読む | live region はポインター / ホイールでの変更時だけ更新する |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。依存なし（純粋な CSS 3D + requestAnimationFrame）
- ファイル: \`components/wheel-carousel/WheelCarousel.tsx\`（\`"use client"\`）+ \`WheelCarousel.module.css\` + \`index.ts\`
- props: \`items\`（文字列 or \`{ id?, title?, subtitle?, image?, alt? }\` の配列）、\`index?\` / \`defaultIndex = 0\` / \`onIndexChange?(i)\`、\`variant = "text" | "card"\`、\`rowHeight\`（既定 text 40px / card 64px）、\`visibleRows = 5\`（奇数に切り上げ）、\`loop = false\`、\`perspective = 500\`、\`highlight = true\`、\`friction = 0.94\`、\`renderItem?(item, { index, total, selected, variant })\`、\`className\`、\`aria-label\`
- 状態: 連続値の位置 \`pos\`（行単位の小数、ループ時は無制限）と目標行 \`target\` を ref に持つ。確定した選択 index だけが React state

### 見た目
- CSS 変数（ルートが既定値を持ち、既定と違う値だけインライン）: \`--wc-row-h: 40px\`（card は 64px）、\`--wc-visible: 5\`、\`--wc-perspective: 500px\`、\`--wc-text\`、\`--wc-band\`、\`--wc-hairline\`、\`--wc-accent: #a78bfa\`
- ジオメトリは CSS で導出: \`--wc-step = 180deg / (visible + 2)\`、半径 \`--wc-radius = rowH / (2·tan(step/2))\`（正面での 1 行の弦 = 行の高さ）、ビューポート高さ \`2r·sin(step·(visible+1)/2)\`
- 行: ビューポート中央に絶対配置し \`transform: translateZ(-r) rotateX(-d·step) translateZ(r)\`。上の行（d < 0）は上端が奥へ倒れる。\`opacity: 1 − min(|d|,1)·0.4\`
- ビューポート: \`perspective\`、\`overflow: hidden\`、上下を \`mask-image: linear-gradient(transparent 0%, 黒 60% 20%, #000 40%, #000 60%, 黒 60% 80%, transparent 100%)\` でフェード
- 選択帯（\`highlight\`）: 中央に行の高さぶん、角丸 10px（card 16px）、白 7% + 上から薄いグラデーション、上下に白 16% のヘアライン（inset シャドウ）、内側にアクセント色の淡い放射グロー。行より先に描いて背後に置く
- text 行: 文字サイズ = 行の高さ × 0.5、500（選択行は 600・白）、\`tabular-nums\`、中央揃え
- card 行: サムネイル（行の高さ − 16px の角丸正方形、\`image\` か黄金角の色相グラデーション、フィルムグレイン overlay）+ タイトル 14px / 600 + サブタイトル 12px / 白 55%

### モーション
- ドラッグ: \`pos -= dy / rowHeight\`。5px 動くまではタップ扱い。ループなしで端を越えたら移動量 × 0.35（ラバーバンド）。速度は行/ms を指数平滑
- 離したとき: 摩擦だけで止まる位置 \`pos + v / ω\`（\`ω = −ln(friction) / 16.667ms\`）を求めて最寄りの行に丸め、その行へ**臨界減衰ばね**で移動（初速 = フリック速度、解析解なのでフレームレート非依存・行き過ぎなし。ω の下限 0.011/ms）。90ms 以上止まってから離した場合は初速 0
- ホイール: 1 イベントの |deltaY| ≥ 50px はマウスのノッチとして目標を 1 行ずつ進める。それ未満（トラックパッド）は 1:1 で追従し、140ms 途切れたら最寄りの行へ吸着
- キー・クリック・制御 index の変更も同じばねで移動。移動中に再指定しても現在の速度を引き継ぐ
- rAF は移動中だけ回し、止まったら停止（アイドル時は 0 コスト）。1 フレームで書くのは各行の \`--d\` / \`--a\` と \`data-off\` だけ
- \`prefers-reduced-motion: reduce\`: ばね移動は即時ジャンプ。ドラッグ中の追従はそのまま（直接操作なので）

### アクセシビリティ
- **listbox を採用**（spinbutton ではなく）: 行はテキスト以外（サムネイル付きカード）も取り、有限の選択肢から 1 つを選ぶ UI なので option の集合として公開するのが正確。spinbutton は数値の増減向けで、カード行の内容や総数を伝えられない
- ビューポートが \`role="listbox"\`・\`tabIndex={0}\`・\`aria-label\`・\`aria-activedescendant\`（確定行の option id）。フォーカスはホイール 1 か所のまま（タブ停止は 1 つ）
- 各行は \`role="option"\`・\`aria-selected\`・\`useId\` ベースの id（複数インスタンスで衝突しない）。見えない行も opacity 0 で残し、ツリーから外さない
- キー: ↑↓ で 1 行、PageUp / PageDown で visibleRows 行、Home / End で先頭 / 末尾
- フォーカスリングは選択帯にアクセント色 2px（ビューポートのマスクで消えないように）
- ポインター / ホイールで値が変わったときだけ、視覚的に隠した \`aria-live="polite"\` で新しい値を読む。マウント時にフォーカスを奪わない

### 受け入れ条件
- 静止状態で上下の行が奥へ倒れて小さく暗くなり、円筒の手前に見える。選択行はガラス帯の中で一番明るい
- はじくと慣性で回り、止まると必ず行にぴったり吸着する。ループ時は端なく回る
- マウスホイール 1 ノッチで 1 行、トラックパッドは指に追従、キーボードとクリックでも同じばねで回る
- 横に並べた複数のホイールが互いに干渉しない。制御 index を変えると回って移動する
- \`onIndexChange\` は操作ごとに 1 回だけ呼ばれる（フレームごとではない）
`;
