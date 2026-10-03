/**
 * Prompt material for NumberTicker (see lib/prompt.ts). Both are Markdown
 * bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same component from scratch.
 */

export const setup = `
1. 数値を見せたい場所に \`<NumberTicker value={12480000} prefix="¥" variant="odometer" />\` を置く。コンポーネント自体が \`"use client"\` なので、Server Component からそのまま使える。
2. 文字サイズ・太さ・色・フォントは親要素か \`className\` で指定する（すべて継承）。等幅数字（\`tabular-nums\`）はコンポーネント側で有効にしているので追加不要。
3. 既定ではスクロールで画面内に入ったときに 1 回だけ開始する。ファーストビューに置く場合は \`startOnView={false}\` でマウント直後から動かす。
4. \`value\` を変えると、いま表示している数値から新しい値へアニメーションし直す（API の取得結果やリアルタイム更新にそのまま使える）。\`delay\` は最初の 1 回だけに効く。
5. 書式は \`Intl.NumberFormat\`。\`locale\`（既定 \`"ja-JP"\`）・\`decimals\`・\`compact\`（24000 → 2.4万 / 24K）を指定する。通貨記号や「%」「+」は \`prefix\` / \`suffix\` に渡す。
6. 値の更新を読み上げさせたい場合（ダッシュボードなど）だけ \`announce\` を付ける。LP の実績数値では付けない。
7. \`npm run build\` が通ることを確認し、「スクロールで開始する」「桁数が増えても横幅が揺れない」「OS の視差効果を減らす設定で最終値が即表示される」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| カウント中に数字の幅が揺れて周囲がガタつく | 等幅数字が切れている、または最終値のゴーストを消した | \`font-variant-numeric: tabular-nums\` と、最終値を \`visibility: hidden\` で重ねる \`.ghost\` を残す |
| アニメーション終了後や再レンダー時に数字が古い値に戻る | 毎フレーム \`el.textContent = …\` で書き換え、React のテキストノードを差し替えてしまった | 同梱の \`writeText()\`（React のテキストノードの \`nodeValue\` だけを書き換える）を使う。毎フレーム \`setState\` もしない |
| オドメーターの桁が区切り文字と上下にずれる | 桁の列は \`overflow: hidden\` の inline-block なので、ベースラインが下端になる | \`align-items: baseline\` に戻さない。全スロットを同じ \`line-height\` / 高さ（\`--nt-cell-h\`）で \`flex-start\` 揃えにする |
| 値を変えると下の桁まで最初から回り直す | 桁の \`key\` を左からの位置にしている | key は**右からの位置**。桁数が増減しても一の位は一の位のまま回り続ける |
| 視差効果オフでも数字が回る | framer-motion は JS で動くので CSS の reduced-motion が効かない | \`<MotionConfig reducedMotion="user">\` と \`usePrefersReducedMotion\` の分岐を外さない |
| 短縮表記のカウント中に「9,999.0」が一瞬出る | ja-JP の compact は 1万未満を省略しない | \`from\` を 10000 以上にする（デモの導入社数カードと同じ） |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules、\`framer-motion\`（v12 以降）
- ファイル: \`components/number-ticker/NumberTicker.tsx\`（\`"use client"\`）+ \`NumberTicker.module.css\` + \`index.ts\`
- Props: \`value\`（必須）、\`from = 0\`、\`variant: "count" | "odometer" = "count"\`、\`decimals = 0\`、\`locale = "ja-JP"\`、\`prefix\`、\`suffix\`、\`compact = false\`、\`duration = 1800\`（ms・count のみ）、\`springStiffness = 110\` / \`springDamping = 19\`（odometer のみ）、\`delay = 0\`（ms・初回のみ）、\`startOnView = true\`、\`announce = false\`、\`className\`
- 書式: \`new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, notation: compact ? "compact" : "standard" })\`。不正な locale は \`RangeError\` になるので try/catch で \`"ja-JP"\` にフォールバック

### 見た目
- フォント・サイズ・太さ・色はすべて継承。ルートは \`display: inline-block; white-space: nowrap; font-variant-numeric: tabular-nums\`
- **count**: \`inline-grid\` の同じセルに「最終値（\`visibility: hidden\` のゴースト）」と「表示中の値」を重ね、\`justify-items: end\`。最初のフレームから最終値の幅が確保され、一の位の位置が動かない
- **odometer**: \`formatToParts\` の結果を 1 文字ずつ見て、数字は「桁の列」、それ以外（区切り・小数点・「万」・マイナス）は静的なテキストにする。prefix / suffix も静的
  - 桁の列: \`height: 1.2em\`（\`--nt-cell-h\`）、\`overflow: hidden\`、上下 14% をマスクでフェード（\`--nt-fade\`）。幅は不可視の「8」で確保
  - 中に 0–9 を 2 周（20 セル）並べた縦ストリップを \`position: absolute\` で置き、\`translateY(-index × 5%)\` で目的のセルを見せる
  - 全スロットを同じ高さ・\`line-height\` で \`align-items: flex-start\` に揃える（\`overflow: hidden\` の inline-block はベースラインが下端になるため baseline 揃えは不可）
  - 数字のグリフは \`Intl.NumberFormat(locale, { useGrouping: false }).format(0〜9)\` から作る（アラビア数字以外の数字体系にも対応）

### モーション
- **count**: framer-motion の \`animate(現在の値, value, { duration, delay, ease: [0.16, 1, 0.3, 1] })\`。\`onUpdate\` で React のテキストノードの \`nodeValue\` を直接書き換え（毎フレーム setState しない）、完了時に 1 回だけ state を更新
- **odometer**: 各桁の \`motion.span\` に \`initial={{ y: 開始セル }}\` / \`animate={{ y: 目的セル }}\`、\`type: "spring", stiffness, damping, mass: 1\`、遅延は \`delay + 左からの桁番号 × 70ms\`
  - 初回: 開始セル = \`from\` の同じ位（右揃え）の数字（1 周目）、目的セル = 10 + 目標の数字（2 周目）。末尾の 0 も含めてすべての桁が回る
  - 値の変更時: 2 周目の中で移動するので、変わった桁だけが回る。桁の key は右からの位置
- 開始: \`IntersectionObserver\`（\`rootMargin: "0px 0px -10% 0px"\`）で画面に入ったら 1 回だけ。\`startOnView={false}\` ならマウント直後
- \`value\` の変更: 表示中の数値（count は ref に保持した現在値、odometer は各ストリップの現在位置）から再アニメーション
- \`prefers-reduced-motion: reduce\`: 最終値を即表示（\`usePrefersReducedMotion\` で分岐し、\`<MotionConfig reducedMotion="user">\` でも包む）

### アクセシビリティ
- 最終値（prefix + 書式済みの値 + suffix）を visually hidden の span に常に置く。アニメーションする層は \`aria-hidden\`
- \`aria-live\` は既定で付けない。\`announce\` のときだけ visually hidden の span に \`aria-live="polite"\`
- SSR では \`from\` の値が描画される（visually hidden の最終値はサーバーでも出力されるので、検索エンジンと支援技術は最終値を読める）

### 受け入れ条件
- スクロールして画面に入ると、カウントアップ / 桁の回転が始まる。1 度だけ
- 桁数が増えても、カウント中に横幅が揺れない。オドメーターの区切り文字と数字の高さが揃う
- \`value\` を変えると、表示中の数値から新しい値へ動き直す
- スクリーンリーダーは最終値だけを読み、途中の数字を読まない
- 視差効果を減らす設定では最終値がすぐに表示される
`;
