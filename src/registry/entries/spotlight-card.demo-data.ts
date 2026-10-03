/**
 * Feature copy shared by the preview grid and the codegen placeholder
 * children (the first item), so the snippet describes what's on screen.
 * Icons live in the demo module: they're React components.
 */
export type DemoFeature = { title: string; description: string };

export const DEMO_FEATURES: readonly DemoFeature[] = [
  {
    title: "高速なビルド",
    description: "変更したファイルだけを再ビルド。数千ページでも数秒で反映されます。",
  },
  {
    title: "エッジ配信",
    description: "世界中のエッジから静的アセットと API を配信し、遅延を最小に。",
  },
  {
    title: "型安全",
    description: "スキーマから型を生成。フロントとバックエンドの食い違いを未然に防ぎます。",
  },
  {
    title: "自動スケール",
    description: "アクセスの急増にも設定なしで追従。使った分だけの課金です。",
  },
];
