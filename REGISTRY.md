# レジストリ導入手順（shadcn CLI）

anima.js のコンポーネントを、shadcn CLI の1コマンドで自分のプロジェクトへ導入するための手順です。

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/<slug>.json
```

## 前提

- ターゲットプロジェクトに `components.json` があること（`npx shadcn@latest init` 済み）。
- Node.js / npm（shadcn CLI は `npx` で実行）。

## 利用可能なコンポーネント

| コンポーネント | レジストリURL | 依存 npm パッケージ |
| --- | --- | --- |
| `InsidePovCarousel` | `/r/inside-pov-carousel.json` | なし（React のみ） |
| `SpinningBox` | `/r/spinning-box.json` | `@react-three/fiber`, `three`（dev: `@types/three`） |

一覧は https://anima-js.vercel.app/r/index.json でも取得できます。

## 名前空間として登録する（おすすめ）

一度だけレジストリを登録しておくと、以降は毎回 URL を書かずに短い名前で扱えます。

```bash
npx shadcn@latest registry add @anima=https://anima-js.vercel.app/r/{name}.json
```

`components.json` の `registries` に追記されます。以降:

```bash
# 短い名前で導入
npx shadcn@latest add @anima/inside-pov-carousel

# 複数まとめて
npx shadcn@latest add @anima/inside-pov-carousel @anima/spinning-box

# 何があるか一覧
npx shadcn@latest search @anima
```

> `npx shadcn@latest add @anima -a`（`-a` で全部）は**動きません**。CLI が `@anima` を名前空間ではなくコンポーネント名として解釈するためです。まとめて入れる場合は上記のように名前を並べてください。

## URL を直接指定する

登録せず単発で導入する場合。**ターゲットプロジェクトのルートで実行します。**

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/inside-pov-carousel.json
```

`spinning-box` を導入する場合、React 19 の peer dependency で npm が確認を求めることがあります。`-s` を付けると出力を消音しつつ依存インストールを `npm install --force` で自動実行します（またはターゲットの `.npmrc` に `legacy-peer-deps=true` を追加しても可）。

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/spinning-box.json -s -y
```

何が配置されるか事前に確認したい場合は `--dry-run` を付けます:

```bash
npx shadcn@latest add https://anima-js.vercel.app/r/inside-pov-carousel.json --dry-run
```

## 配置先と import

導入後のファイル構成:

```
src/components/inside-pov-carousel/
├── index.tsx                       ← コンポーネント本体
└── InsidePovCarousel.module.css    ← スタイル（自己完結）
src/components/spinning-box/
└── index.tsx                       ← コンポーネント本体
```

使用例:

```tsx
import { InsidePovCarousel } from "@/components/inside-pov-carousel";

export default function Page() {
  // items を省略するとプレースホルダーのグラデーションカードで回転する
  return <InsidePovCarousel />;
}
```

`SpinningBox` は react-three-fiber の `<Canvas>` の中だけで使います。`<Canvas>` は内部で `createContext` を使うため、**必ず Client Component（先頭に `"use client"` があるファイル）の中で使います**。App Router の `page.tsx` はデフォルトでサーバーコンポーネントなので、`"use client"` を付けるか、クライアントのラッパーコンポーネントを作ってください:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { SpinningBox } from "@/components/spinning-box";

export default function Page() {
  return (
    <Canvas>
      <ambientLight intensity={0.6} />
      <SpinningBox />
    </Canvas>
  );
}
```

## 画像（carousel のみ）の配置

- **`items` を省略**すればプレースホルダー描画になるため、動作確認に画像は不要です。
- 実画像を使う場合、生成コードの `items={[...]}` が参照する `/media/<ファイル名>` のファイルを、ターゲットの `public/media/` に置く必要があります。
- プレイグラウンドの「メディアをアップロード」欄にある **「public/media/ 用に ZIP でダウンロード」** を使うと、生成コードが参照するファイル名のまま ZIP で書き出せます。展開先を `public/media/` にすればパスが解決します。
- 手動でコピーする場合は以下。

```powershell
xcopy /E /I /Y "C:\path\to\your\uploads\*" "C:\path\to\target\public\media\"
```

## 再生成（メンテナ向け）

レジストリ JSON は `public/r/` に出力されるビルド生成物で、リポジトリにはコミットされません。`npm run build` が毎回生成し直すため、公開中の JSON が `src/` のエントリとずれることはありません。

単体で生成したい場合:

```bash
npm run registry:build
```

`registry/*.json` はコミット済みなので、クローン直後でもビルドなしで `npx shadcn add` できます。
