# レジストリ導入手順（shadcn CLI）

`anima.js` のプレイグラウンドで作成したコンポーネントを、**別プロジェクト**に shadcn CLI の1コマンドで導入するための手順です。

```bash
npx shadcn add <相対パス>/registry/<slug>.json -y
```

## 前提

- ターゲットプロジェクトに `components.json` があること（`npx shadcn@latest init` 済み）。
- Node.js / npm（shadcn CLI は `npx` で実行）。

## 利用可能なコンポーネント

| コンポーネント | ファイル | 依存 npm パッケージ |
| --- | --- | --- |
| `InsidePovCarousel` | `registry/inside-pov-carousel.json` | なし（React のみ） |
| `SpinningBox` | `registry/spinning-box.json` | `@react-three/fiber`, `three`（dev: `@types/three`） |

## 導入コマンド

**ターゲットプロジェクトのルートで実行します。**

> ⚠️ **Windows の罠**: 絶対パス（`C:\Users\...\registry\foo.json`）を渡すと CLI が URL と誤解釈して失敗します。**必ず相対パス**を使ってください。

**PowerShell（Windows）**:

```powershell
npx shadcn add ..\anima.js\registry\inside-pov-carousel.json -y
```

**bash（Git Bash / WSL / macOS）**:

```bash
npx shadcn add ../anima.js/registry/inside-pov-carousel.json -y
```

`spinning-box` を導入する場合、React 19 の peer dependency で npm が確認を求めることがあります。`-s` を付けると出力を消音しつつ依存インストールを `npm install --force` で自動実行します（またはターゲットの `.npmrc` に `legacy-peer-deps=true` を追加しても可）。

```powershell
npx shadcn add ..\anima.js\registry\spinning-box.json -s -y
```

何が配置されるか事前に確認したい場合は `--dry-run` を付けます:

```powershell
npx shadcn add ..\anima.js\registry\inside-pov-carousel.json --dry-run -y
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

## 画像（carousel のみ）の手動コピー

- **`items` を省略**すればプレースホルダー描画になるため、動作確認に画像は不要です。
- 実画像を使う場合、生成コードの `items={[...]}` が参照する `/media/<ファイル名>` のファイルを、**ターゲットの `public/media/` に手動でコピー**してください。

```powershell
xcopy /E /I /Y "C:\path\to\your\uploads\*" "C:\path\to\target\public\media\"
```

## 再生成

`anima.js` 内でエントリ（`src/registry/entries/*.tsx`）やコンポーネント（`src/registry/components/<slug>/`）を変更したら、レジストリ JSON を再生成します:

```bash
npm run registry:build
```

`registry/*.json` はコミット済みなので、クローン直後でもビルドなしで `npx shadcn add` できます。
