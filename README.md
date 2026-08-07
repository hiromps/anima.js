# anima.js

React 向けのインタラクティブな3Dアニメーションコンポーネント集。ブラウザ上で値を調整し、生成されたコードをコピーするか、shadcn CLI の1コマンドで自分のプロジェクトへ導入できます。

**サイト**: https://anima-js.vercel.app

## 使う

導入先のプロジェクトに `components.json` があること（`npx shadcn@latest init` 済み）が前提です。

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/inside-pov-carousel.json
npx shadcn@latest add https://anima-js.vercel.app/r/spinning-box.json
```

| コンポーネント | 概要 | 依存パッケージ |
| --- | --- | --- |
| `inside-pov-carousel` | 内側視点のリングカルーセル。純粋な CSS 3D、ドラッグ慣性、奥行きの陰影 | なし（React のみ） |
| `spinning-box` | react-three-fiber の最小シーン | `@react-three/fiber`, `three` |

サイト上の各コンポーネントページで、値を調整しながらインストールコマンドと JSX の両方をコピーできます。設定は URL に反映されるので、そのままリンクを共有できます。

詳しい導入手順・配置先・画像の置き方は [REGISTRY.md](./REGISTRY.md) を参照してください。

## 開発する

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # codegen / URL 状態のユニットテスト
npm run lint
npm run build    # レジストリJSONを再生成してから next build
```

`npm run build` は `public/r/*.json`（配布用レジストリ）を毎回生成し直します。`public/r/` はビルド生成物なのでコミットされません。

### コンポーネントを追加する

1. `src/registry/components/<slug>/` に本体を作る（1つの `.tsx` と、必要なら CSS モジュール）
2. `src/registry/entries/<slug>.entry.tsx` にエントリを作る — `schema` がコントロールUI・コード生成・URL共有の単一の情報源になります
3. `src/registry/index.ts` の `registry` 配列に追加する

スキーマの型と各フィールドの意味は `src/registry/schema.ts` を参照してください。

## ライセンス

コードは [MIT](./LICENSE)。自由に使えます。

`public/media/` 配下のメディア（サイトのプレビュー用のデモ素材）は MIT の対象外です。コンポーネントを使う際はご自身のメディアを渡してください。
