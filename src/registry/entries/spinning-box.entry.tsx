import { SpinningBox } from "../components/spinning-box/SpinningBox";
import { defineEntry } from "../schema";

const schema = {
  color: {
    type: "color",
    label: "Color",
    group: "Material",
    default: "#8b5cf6",
  },
  wireframe: {
    type: "boolean",
    label: "Wireframe",
    group: "Material",
    default: false,
  },
  speed: {
    type: "number",
    label: "Speed",
    group: "Motion",
    default: 1,
    min: 0,
    max: 5,
    step: 0.1,
  },
  scale: {
    type: "number",
    label: "Scale",
    group: "Geometry",
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
    "Minimal react-three-fiber scene — a spinning standard-material cube. Proof of the WebGL rendering path.",
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
        placeholder: "render inside a react-three-fiber <Canvas> with lights",
      },
    ],
  },
});
