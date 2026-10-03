/**
 * Prompt material for DotGridBackground (see lib/prompt.ts). Both are
 * Markdown bodies; the prompt generator adds the section headings.
 *
 * `setup` is what the consumer has to do after `npx shadcn add`; `spec` is
 * the full visual/behavioral spec so an assistant that can't reach the
 * registry can rebuild the same backdrop from scratch.
 */

export const setup = `
1. ヒーローの中身（見出し・ボタンなど）を \`children\` として渡す: \`<DotGridBackground>…</DotGridBackground>\`。コンポーネント自体が \`"use client"\` なので、Server Component からそのまま使える。
2. ルートは \`width: 100%; height: 100%\` で**親を埋める**。親に高さを与える（例: ラッパーに \`min-height: 100svh\`、または \`className\` で \`min-height\` を指定）。高さの無い親の中では中身の高さだけになり、キャンバスもその大きさになる。
3. 下地色はページ背景に合わせる。既定は \`#08080b\`。変えるときは \`className\` で CSS 変数 \`--dg-base\` を上書きする（例: \`.hero { --dg-base: #0a0a0a; }\`）。上部の淡いグローは \`accentColor\` から作られる。
4. \`color\` はドットの静止色で、不透明度 .3 前後で描かれる。暗い色を渡すとほぼ見えなくなるので、明るめのグレー〜白系を使う。\`accentColor\` はポインター付近・波紋・ウェーブの山の色。
5. ポインターはルート要素で受け取る（中のボタンやリンクの上でも反応する）。\`touch-action\` は変えていないので、スマホではスワイプでページがスクロールし、タップで波紋が出る。
6. \`npm run build\` が通ることを確認し、実機で「ポインター付近のドットが光って押しのけられ、離すと戻る」「スクロールで画面外に出すと CPU 使用率が下がる」「OS の視差効果を減らす設定で静止表示になる」を確認する。

### 触ってはいけないところ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ドットがぼやける / Retina で太く見える | キャンバスのビットマップを CSS サイズのまま作った | \`canvas.width = cssWidth × min(devicePixelRatio, 2)\` にし、\`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)\` で描く。CSS 上のサイズは 100% のまま |
| 縮小表示（\`transform: scale\`）の中でポインター位置と光がずれる | \`clientX - rect.left\` をそのまま使った | \`rect.width / clientWidth\` で拡大率を割り戻してからキャンバス座標にする |
| ポインターを動かすとカクつく / React の再レンダーが走る | 座標やドットの状態を state で持った | 座標は変数に記録するだけ。ドットの状態は型付き配列に持ち、\`requestAnimationFrame\` の中で描く |
| 何も動いていないのに CPU を使い続ける | 毎フレーム無条件に \`requestAnimationFrame\` を回した | ウェーブ・波紋・ばねの揺れ・ポインターのフェードのどれかが動いている間だけ次のフレームを要求する。IntersectionObserver で画面外なら止める |
| 大きな画面で重い | ドット 1 個ごとに \`fillStyle\` を変えて \`fill()\` した | 色 × 不透明度を段階に量子化してバケット分けし、バケットごとに 1 パス・1 回の \`fill()\` で描く |
| リサイズの瞬間に一瞬真っ黒になる | \`canvas.width\` を変えるとビットマップが消える | リサイズ直後に同期的に 1 回描画する |
| \`gap\` を極端に小さくすると重い | ドット数は面積 / gap² で増える | \`gap\` は 12px 以上を目安にする |
`;

export const spec = `
### 前提
- Next.js（App Router）、React 19、TypeScript、CSS Modules。追加の npm 依存なし（Canvas 2D）
- ファイル: \`components/dot-grid-background/DotGridBackground.tsx\`（\`"use client"\`）+ \`DotGridBackground.module.css\`
- Props: \`dotSize\`（直径 px、既定 2）、\`gap\`（px、既定 22）、\`color\`（既定 #a1a1b5）、\`accentColor\`（既定 #a78bfa）、\`radius\`（影響範囲 px、既定 160）、\`push\`（押しのけ最大 px、既定 12）、\`wave\`（既定 true）、\`waveSpeed\`（倍率、既定 1）、\`ripple\`（既定 true）、\`fade\`（既定 true）、\`className\`、\`children\`
- CSS 変数: \`--dg-accent\`（既定 #a78bfa、既定と異なる場合だけ inline）、\`--dg-base\`（下地、#08080b、props ではなく className で上書き）

### 見た目
層構成は「下地 → アクセントのグロー → ドットのキャンバス → 中身」。

- **ルート（.root）**: \`position: relative; width: 100%; height: 100%; overflow: hidden; isolation: isolate\`、背景 \`var(--dg-base)\`、文字色 白
- **グロー（.glow）**: 上中央から \`radial-gradient(ellipse 60% 48% at 50% 0%, color-mix(in srgb, var(--dg-accent) 22%, transparent), transparent 72%)\` + 下側にごく弱い同色の楕円。静止
- **キャンバス（canvas）**: \`position: absolute; inset: 0; width/height: 100%; pointer-events: none\`、\`aria-hidden\`。ビットマップは ResizeObserver で CSS サイズ × \`min(devicePixelRatio, 2)\`
- **ドット**: \`gap\` 間隔の正方格子を中央揃えで、四辺から 1 列はみ出すように敷く。静止時は直径 \`dotSize\`、\`color\` を不透明度 .3 で
- **周辺フェード（fade）**: 中心からの楕円距離 e（辺の中点で 1）に対し、e = .45 から 1.1 にかけて smoothstep で不透明度を 0 へ。見出しの周りは鮮明なまま
- **中身（.content）**: \`position: relative; z-index: 2; height: 100%\`

### モーション
- **ポインター**: ルートの \`pointermove\`（passive）で座標を記録。影響度 s = smoothstep(1 - 距離 / radius) × 強さ。強さはポインターが入ると 1、離れると 0 へ毎フレーム 14% ずつ近づく（ふわっと点灯・消灯）
  - ドットは 直径 × (1 + 1.5s) に拡大、色は accentColor へ s × 1.1 だけ近づき、不透明度は .3 + .75s
  - 押しのけ: ポインターから外向きに s × push の目標位置を与え、ばね（剛性 .12、減衰 .78 / 60fps フレーム、dt で補正）で追従。目標が 0 に戻ればばねで元の格子位置へ戻る
- **ウェーブ（wave）**: 斜め（約 31°）に進む波長 560px の正弦波を 4 乗して鋭い明るさの帯にし（× .6）、波長 900px の逆向きのうねり（× .15）を足す。帯の部分はドットが少し大きく、明るく、アクセント寄りになる。時計は描画中だけ進むので、画面外から戻っても跳ばない
- **波紋（ripple）**: \`pointerdown\` の位置から 0.55px/ms で広がる幅 46px のリング（ガウス形）、寿命 1.7 秒で \`(1 - 経過率)^1.6\` で減衰。リング上のドットは光り、外向きに少し押される。同時に最大 6 個
- **描画**: 色 12 段階 × 不透明度 20 段階のバケットに量子化し、計数ソートでドットを並べてバケットごとに 1 パス + 1 回の \`fill()\`
- **ループ制御**: rAF は「ウェーブ（waveSpeed > 0）・波紋・ポインター強さの変化・ばねの揺れ」のどれかがある間だけ継続し、静まったら止める。ポインター操作で再開。IntersectionObserver で画面外なら停止。リサイズ時は同期的に 1 回描く
- 縮小表示の中でもずれないよう、ポインター座標は \`(clientX - rect.left) × clientWidth / rect.width\` でルートの CSS px に変換
- タッチ: タップで波紋とその場の点灯、指を離すと消灯。\`touch-action\` は変えずスクロールを妨げない
- \`prefers-reduced-motion: reduce\`: ウェーブ・波紋・ポインター追従をすべて止め、中心ほど少し大きく明るくアクセント寄りの**静止したビネット**を 1 回だけ描く（設定の変更も監視）

### アクセシビリティ
- キャンバスとグローは \`aria-hidden="true"\`、\`pointer-events: none\`。装飾のみで、中身のボタンやリンクの操作・フォーカスを妨げない
- 中身の文字のコントラストを確保する（本文は白 .6 以上を目安に）。点滅や急な明滅は無い

### 受け入れ条件
- ホバーしていない初回描画でも、ウェーブの帯が流れていて空っぽに見えない
- ポインター付近のドットがふくらんで光り、押しのけられ、離すとばねで格子に戻る
- クリック / タップで波紋のリングが広がって消える
- 何も動いていない（ウェーブ off、ポインター静止）ときと画面外では rAF が止まる
- devicePixelRatio 2 の画面でドットがくっきりしている。\`transform: scale(.4)\` の中でもポインター位置とずれない
- OS の「視差効果を減らす」で静止したビネット表示になる
`;
