# anima.js

React 向けのインタラクティブな3Dアニメーションコンポーネント集。使いたいコンポーネントの「AI プロンプトをコピー」を押して AI コーディングツールに貼るだけで、自分のプロジェクトに導入できます。手動なら shadcn CLI の1コマンドでも入ります。

**サイト**: https://anima-js.vercel.app

## 使う

### AI コーディングツールに貼る（おすすめ）

1. サイトで使いたいコンポーネントを選び、**「AI プロンプトをコピー」** を押す（ギャラリーのカードなら既定の設定、プレイグラウンドなら調整した設定が反映されます）
2. Claude Code / Cursor / ChatGPT などに、自分のプロジェクトを開いた状態でそのまま貼り付ける

プロンプトは自己完結しています。コンポーネントのソースコード一式（レジストリが配信するものと同じ内容）、必要な npm パッケージ、現在の設定を反映した使用例、レイアウトや CSS の組み込み手順、完了条件が含まれているので、AI 側に shadcn CLI やネットワークアクセスは必要ありません。`components.json` や Tailwind が無いプロジェクトでも導入できます。

### shadcn CLI で入れる

導入先のプロジェクトに `components.json` があること（`npx shadcn@latest init` 済み）が前提です。

一度レジストリを登録すれば、以降は短い名前で全コンポーネントを扱えます:

```bash
npx shadcn@latest registry add @anima=https://anima-js.vercel.app/r/{name}.json

npx shadcn@latest search @anima                  # 一覧
npx shadcn@latest add @anima/inside-pov-carousel # 導入
```

URL を直接指定しても導入できます:

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/inside-pov-carousel.json
```

| コンポーネント | 概要 | 依存パッケージ |
| --- | --- | --- |
| `inside-pov-carousel` | 内側視点のリングカルーセル。純粋な CSS 3D、ドラッグ慣性、奥行きの陰影 | なし（React のみ） |
| `glass-bottom-tab-bar` | iOS アプリ風の浮遊ガラスボトムタブバー。すりガラス + パステルの発光、スプリングで動くアクティブピル。モバイル幅専用 | `framer-motion`, `lucide-react` |
| `spinning-box` | react-three-fiber の最小シーン | `@react-three/fiber`, `three` |

サイト上の各コンポーネントページで、値を調整しながら AI プロンプト・インストールコマンド・JSX のいずれもコピーできます。設定は URL に反映されるので、そのままリンクを共有できます。

詳しい導入手順・配置先・画像の置き方は [REGISTRY.md](./REGISTRY.md) を参照してください。

## 開発する

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # codegen / URL 状態のユニットテスト
npm run lint
npm run build    # レジストリJSONを再生成してから next build
```

`npm run dev` と `npm run build` は最初に `npm run registry:build` を実行し、`public/r/*.json`（配布用レジストリ、gitignore 済み）と `src/registry/sources.generated.ts`（AI プロンプトに埋め込むソース一式、コミット対象）を生成し直します。コンポーネントを編集したら生成モジュールもコミットしてください。古いままだと `npm test` が失敗します。

### コンポーネントを追加する

1. `src/registry/components/<slug>/` に本体を作る（1つの `.tsx` と、必要なら CSS モジュール）
2. `src/registry/entries/<slug>.entry.tsx` にエントリを作る — `schema` がコントロールUI・コード生成・URL共有の単一の情報源になります。生成コードが参照する import（アイコンなど）は `codegen.extraImports` で、インストール後に利用者側で必要な作業は `prompt.setup` で、見た目の仕様は `prompt.spec` で渡します
3. `src/registry/index.ts` の `registry` 配列に追加する
4. `npm run registry:build` を実行し、更新された `src/registry/sources.generated.ts` をコミットする

エントリはサーバー側（`generateStaticParams` や sitemap）からも読み込まれるため、フックを使うプレビュー用ラッパーはエントリと同じ階層の `"use client"` 付きファイルに分け、プレビューとコード生成の両方が使うデータはディレクティブなしの通常モジュールに置きます（`glass-bottom-tab-bar.demo.tsx` / `.demo-data.ts` が例）。

スキーマの型と各フィールドの意味は `src/registry/schema.ts` を参照してください。

## ライセンス

コードは [MIT](./LICENSE)。自由に使えます。

`public/media/` 配下のメディア（サイトのプレビュー用のデモ素材）は MIT の対象外です。コンポーネントを使う際はご自身のメディアを渡してください。
