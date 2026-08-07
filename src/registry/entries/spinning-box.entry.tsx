import { SpinningBox } from "../components/spinning-box/SpinningBox";
import { defineEntry } from "../schema";

const schema = {
  color: {
    type: "color",
    label: "色",
    group: "マテリアル",
    default: "#8b5cf6",
  },
  wireframe: {
    type: "boolean",
    label: "ワイヤーフレーム",
    group: "マテリアル",
    default: false,
  },
  speed: {
    type: "number",
    label: "回転速度",
    group: "モーション",
    default: 1,
    min: 0,
    max: 5,
    step: 0.1,
  },
  scale: {
    type: "number",
    label: "スケール",
    group: "ジオメトリ",
    default: 1,
    min: 0.2,
    max: 3,
    step: 0.1,
  },
} as const;

export const spinningBoxEntry = defineEntry({
  slug: "spinning-box",
  name: "SpinningBox",
  description:
    "最小構成の react-three-fiber シーン — standard マテリアルの回転する立方体。WebGL 描画経路の動作確認用。",
  category: "3d-scene",
  tech: ["r3f"],
  host: "r3f",
  schema,
  component: SpinningBox,
  codegen: {
    componentName: "SpinningBox",
    importPath: "@/components/spinning-box",
    dependencies: ["@react-three/fiber", "three"],
    devDependencies: ["@types/three"],
    requiredDataProps: [
      {
        name: "<Canvas>",
        placeholder:
          "ライトを配置した react-three-fiber の <Canvas> の中に描画してください",
      },
    ],
  },
});
