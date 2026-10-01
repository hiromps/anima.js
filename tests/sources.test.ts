import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { registrySources } from "@/registry/sources.generated";
import { registryFiles, renderSourcesModule } from "../scripts/registry-files";

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT, "src", "registry", "components");
const GENERATED = path.join(ROOT, "src", "registry", "sources.generated.ts");

/**
 * The committed sources module must match the files on disk: it is what the
 * AI prompt pastes into other people's projects, so a stale copy would ship
 * an old component. `npm run registry:build` regenerates it.
 */
describe("src/registry/sources.generated.ts", () => {
  const slugs = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it("covers every component directory", () => {
    expect(Object.keys(registrySources).sort()).toEqual(slugs);
  });

  it("matches the files on disk byte for byte", () => {
    for (const slug of slugs) {
      const expected = registryFiles(COMPONENTS_DIR, slug).map(
        ({ path: filePath, content }) => ({ path: filePath, content }),
      );
      expect(registrySources[slug], slug).toEqual(expected);
    }
  });

  it("is the generator's exact output (run `npm run registry:build`)", () => {
    const sources: Record<string, ReturnType<typeof registryFiles>> = {};
    for (const slug of Object.keys(registrySources)) {
      sources[slug] = registryFiles(COMPONENTS_DIR, slug);
    }
    expect(fs.readFileSync(GENERATED, "utf8")).toBe(renderSourcesModule(sources));
  });
});
