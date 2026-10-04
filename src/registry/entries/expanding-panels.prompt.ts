/**
 * Prompt material for ExpandingPanels (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same carousel from scratch.
 */

export const setup = `
1. \`<ExpandingPanels items={[…]} />\` は **\`"use client"\` のコンポーネントの中に置く**。\`icon\`（コンポーネント参照）・\`renderItem\`・\`onIndexChange\` は関数なので、サーバーコンポーネントから直接渡せない（生成コードは \`icon\` を必ず含む）。ページがサーバーコンポーネントなら、小さなクライアントラッパーを作ってそこで描画する。\`items\` は \`{ id?, title?, subtitle?, image?, alt?, icon? }\` の配列。
2. \`image\` は写真の URL（\`public/\` 配下のパスや CDN）か、CSS の背景値（\`linear-gradient(…)\` など、カンマ区切りの複数レイヤー可）。省略すると自動のグラデーションになる。写真の場合は \`alt\` も渡す（展開時のキャプションの一部として読み上げられる）。
3. \`icon\` には \`lucide-react\` のアイコンコンポーネントをそのまま渡す（例: \`import { Landmark } from "lucide-react"\` → \`icon: Landmark\`）。
4. 幅は親要素に従う（\`width: 100%\`）。横並びの高さは \`height\`（既定 400px）。親の幅が 520px 未満だと \`orientation="auto"\` は縦積みに切り替わる。判定は**ウィンドウではなく親要素の幅**（コンテナクエリ）なので、サイドバー内などでも正しく切り替わる。
5. アクティブなパネルを外から制御する場合は \`activeIndex\` と \`onIndexChange\` を組で渡す。初期位置だけなら \`defaultIndex\`。
6. 自動再生（\`autoplay\`）は、ホバー中・フォーカス中・画面外では止まり、OS の「視差効果を減らす」設定ではオフになる。アクティブなパネル右上に一時停止ボタンが出る（WCAG 2.2.2）。
7. \`npm run build\` が通ることを確認し、「ホバーで滑らかに伸びる」「伸びている最中に文字が折り返し直さない」「Tab で 1 回だけ止まり、矢印キーで移動できる」「スマホ幅で縦積みになる」を実機で確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 伸縮の途中でトラックの端に隙間が出る / ガタつく | パネルごとに \`transition\` の時間やイージングを変えた、または \`flex\` ショートハンドをアニメーションさせた | \`flex-grow\` だけを、全パネル同じ \`--ep-duration\` / \`--ep-ease\` で遷移させる。同時に始まる限り grow の合計が常に 1 になり、隙間が出ない |
| 伸びている間にキャプションが何度も折り返す・画像が拡大縮小する | アートやキャプションの幅をパネル幅（\`100%\`）にした | 幅は \`--ep-expanded\`（展開後の幅を \`100cqi\` から算出）に固定し、パネルの \`overflow: hidden\` で見せる範囲だけ変える |
| 縦積みに切り替わらない / \`cqi\` が効かない | ルートの \`container: ep / inline-size\` を外した、またはルート自身に \`cqi\` を使った | コンテナはルート、\`cqi\` を使うのはその子孫だけ。\`vw\` に置き換えない（プレビューやサイドバーで壊れる） |
| スマホでタップすると 2 回切り替わる / 違うパネルが開く | ホバー判定をタッチにも効かせている | ホバーは \`pointerType === "mouse"\` のときだけ。タッチはクリックで処理する |
| 「Functions cannot be passed directly to Client Components」エラー | サーバーコンポーネントから \`icon\` / \`renderItem\` / \`onIndexChange\` を渡している | \`"use client"\` のラッパーコンポーネント内で \`items\` を組み立てて描画する |
| 自動再生が進まない | 進捗バーの CSS アニメーションを消した / \`display: none\` にした | 進捗バーの \`animationend\` がタイマー。見た目を変えるなら色や太さだけにする |
| 視差効果オフでも切り替わり続ける | CSS 側だけで reduced-motion を処理している | JS の \`useSyncExternalStore\` による判定で自動再生自体を止めている。外さない |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`lucide-react\`（一時停止 / 再生アイコンと \`icon\` の型）。アニメーションライブラリは使わない（CSS の transition / animation のみ）
- ファイル: \`components/expanding-panels/ExpandingPanels.tsx\`（\`"use client"\`）、\`ExpandingPanels.module.css\`、\`index.ts\`
- Props: \`items\`、\`activeIndex\` / \`defaultIndex\` / \`onIndexChange\`、\`trigger\`（\`"hover"\` | \`"click"\`、既定 hover）、\`autoplay\`（既定 false）、\`interval\`（ms、既定 5000）、\`collapsedSize\`（px、既定 64）、\`gap\`（px、既定 10）、\`radius\`（px、既定 24）、\`height\`（px、既定 400）、\`orientation\`（\`"auto"\` | \`"horizontal"\` | \`"vertical"\`）、\`renderItem(item, { index, total, active })\`、\`className\`、\`aria-label\`
- 既定値は CSS カスタムプロパティ（\`--ep-*\`）としてルートに持ち、props が既定と違うときだけインラインで上書きする。\`--ep-count\` だけは常にインラインで渡す

### 見た目
- 暗い背景向け。角丸の縦長パネルが横一列に並び、アクティブな 1 枚が残りの幅をすべて使う。閉じたパネルは \`collapsedSize\` 幅の帯
- 各パネル: アート（写真 or グラデーション）→ 下からの暗いスクリム → 薄いフィルムグレイン（SVG ノイズ、\`mix-blend-mode: overlay\`、不透明度 0.14）→ 内側 1px の白いハイライト線。閉じたパネルは全体を少し暗くし、ホバーで少し明るくする
- 閉じた帯: 上にアイコン、下に縦書きタイトル（\`writing-mode: vertical-rl\`、日本語は正立・英字は横倒し）と「01」形式の番号
- 展開時のキャプション（左下）: ガラス調の丸いアイコンチップ + 「01 / 05」、大きな見出し（\`clamp(26px, 5.2cqi, 44px)\`、字間 -0.025em）、2 行程度のサブタイトル（白 74%）
- 自動再生時: キャプションの下に 2px の進捗バー（白のグラデーション + 淡い発光）、右上にガラス調の一時停止 / 再開ボタン
- 縦積み（コンテナ幅 520px 未満で自動、または \`orientation="vertical"\`）: パネルが縦に並び、アクティブが高さ方向に伸びる（展開高さ \`clamp(220px, 72cqi, 380px)\`）。帯のタイトルは横書きに戻る

### モーション
- 伸縮は \`flex-grow\` の transition（0 ↔ 1、\`flex-basis\` は \`collapsedSize\`）。720ms、\`cubic-bezier(0.22, 1, 0.36, 1)\`。全パネル同じ時間・イージングにして grow の合計を常に 1 に保つ
- アートとキャプションは展開後の幅 \`calc(100cqi - (n - 1) × (collapsedSize + gap))\` で最初からレイアウトし、アートは中央寄せ。閉じた帯はその中央の切り抜きに見える。パネルが伸びても中身は再レイアウトされない
- アートは閉じている間 \`scale(1.08)\`、開くと \`scale(1)\` へ（transform のみ）
- キャプションは展開の半分が過ぎてから フェード + 10px 浮き上がり（遅延 360ms）。閉じるときは遅延なしで 160ms で消える。帯のラベルはその逆
- ホバーは 90ms のインテント遅延つき（帯の上をなぞっただけで全部開かない）。マウスのときだけ
- 自動再生: 進捗バーの CSS アニメーション（\`scaleX\` 0→1、\`interval\` ms、linear）の \`animationend\` で次へ。ホバー・フォーカス・画面外（IntersectionObserver）・一時停止ボタンで \`animation-play-state: paused\`
- \`prefers-reduced-motion: reduce\`: 伸縮・フェードは即時、自動再生は JS で無効化（静的でも同じレイアウトで美しく見える）

### アクセシビリティ
- ルート: \`<section aria-roledescription="カルーセル" aria-label>\`。各パネル: \`role="group" aria-roledescription="スライド" aria-label="n / total"\`
- **パターンの選択: タブではなく \`aria-expanded\` 付きボタン（ディスクロージャー）**。各パネルはトリガーと内容を兼ね、閉じたパネルも帯として見え続ける。タブ（tab と別要素の tabpanel）ではこの形を正しく表せないため。パネル全面を覆う透明な \`<button aria-expanded aria-controls>\` がトリガーで、ラベルはタイトル
- ロービング tabindex: アクティブなボタンだけ \`tabIndex=0\`。←→↑↓ で前後（端で循環）、Home / End で先頭 / 末尾。フォーカスしたパネルが開く
- 閉じたパネルのキャプションは \`inert\` + \`aria-hidden\`。アートは装飾扱い（\`aria-hidden\`）で、写真の \`alt\` はキャプション内の視覚的に隠したテキストとして読ませる
- ライブリージョン: 自動再生中は \`aria-live="off"\`、それ以外は \`polite\`。フォーカスによる切り替えはボタン自体が読まれるので通知しない
- フォーカスリングは白 2px、パネル内側に \`outline-offset: -4px\`。マウント時にフォーカスを奪わない

### 受け入れ条件
- ホバー（hover 指定時）・クリック・タップ・キーボードで開くパネルが切り替わり、\`onIndexChange\` が呼ばれる
- 伸縮中にキャプションの折り返しやアートの拡縮が起きない。トラック端に隙間が出ない
- 自動再生で進捗バーが満ちると次のパネルへ。ホバー / フォーカス / 画面外 / 一時停止ボタンで止まり、再開すると続きから進む
- 520px 未満のコンテナで縦積みになり、縦方向でも同じ操作ができる
- 視差効果を減らす設定で自動再生が止まり、切り替えは即時
- Tab での停止はカルーセル全体で 1 か所（+ 自動再生時の一時停止ボタン）
`;
