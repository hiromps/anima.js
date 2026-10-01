/**
 * generate-registry.ts — exports the in-repo component entries as shadcn
 * `registry:component` JSON files plus an index, written into `public/r/` so
 * Next.js serves them and anyone can install a component with:
 *
 *   npx shadcn@latest add https://<domain>/r/<slug>.json
 *
 * It also writes `src/registry/sources.generated.ts`, the same shipped files
 * as string constants, which the AI prompt embeds so a component can be
 * reproduced without the CLI. That module is committed (app code, tests and
 * lint import it); the JSON is a gitignored build artifact. Both are rebuilt
 * by `npm run dev` and `npm run build`, and tests/sources.test.ts fails when
 * the committed module is stale.
 *
 * Run standalone with: npm run registry:build
 *
 * The entries carry live React components that import CSS modules and
 * three/fiber, which a plain Node/tsx run cannot load (tsx 4.x has no
 * config file / loader hook for stubbing `.module.css`). So the entry list
 * is loaded through an esbuild bundle that stubs `.css` imports and keeps
 * npm packages external — the script only ever reads entry *metadata*, it
 * never renders a component.
 */
import { build } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
// Plain constants, no path aliases — safe to import directly under tsx.
import { siteUrl } from "../src/lib/site";
import { registryFiles, renderSourcesModule, type RegistryFile } from "./registry-files";

/** The esbuild output is CJS, so it needs a real `require` to load. */
const requireCjs = createRequire(import.meta.url);

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const COMPONENTS_DIR = path.join(SRC_DIR, "registry", "components");
const ENTRY_FILE = path.join(SRC_DIR, "registry", "index.ts");
const OUT_DIR = path.join(ROOT, "public", "r");
const SOURCES_FILE = path.join(SRC_DIR, "registry", "sources.generated.ts");
const BUNDLE_FILE = path.join(ROOT, "node_modules", ".cache", "registry-entry-bundle.cjs");

const REGISTRY_ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

/** Bare npm imports (react, three, @react-three/fiber) stay external — the
    bundle only needs to *collect* entry objects, never render. `@/...`
    path aliases are resolved by the `alias` option before this plugin runs,
    so they never reach this filter. */
const externalNpmPlugin: import("esbuild").Plugin = {
  name: "external-npm",
  setup(build) {
    build.onResolve({ filter: /^(@[^/]+\/[^/]+|[^./@\\][^/\\]*)$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

/** CSS modules become an empty object — the bundle is never rendered. */
const cssStubPlugin: import("esbuild").Plugin = {
  name: "css-stub",
  setup(build) {
    build.onLoad({ filter: /\.module\.css$|\.css$/ }, () => ({
      contents: "export default {};",
      loader: "js",
    }));
  },
};

/** Loads the registry array by bundling index.ts with CSS stubbed out. */
async function loadRegistry(): Promise<
  Array<{
    slug: string;
    name: string;
    description: string;
    codegen: {
      dependencies?: string[];
      devDependencies?: string[];
    };
  }>
> {
  fs.mkdirSync(path.dirname(BUNDLE_FILE), { recursive: true });
  try {
    await build({
      entryPoints: [ENTRY_FILE],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: BUNDLE_FILE,
      logLevel: "warning",
      alias: { "@": SRC_DIR },
      plugins: [externalNpmPlugin, cssStubPlugin],
    });
    delete requireCjs.cache[BUNDLE_FILE];
    return requireCjs(BUNDLE_FILE).registry;
  } finally {
    fs.rmSync(BUNDLE_FILE, { force: true });
  }
}

function toRegistryItem(entry: {
  slug: string;
  name: string;
  description: string;
  codegen: { dependencies?: string[]; devDependencies?: string[] };
}) {
  return {
    $schema: REGISTRY_ITEM_SCHEMA,
    // The slug, not the PascalCase component name — it is the identifier the
    // file name, index.json and any registryDependencies refer to. File
    // placement is driven by each file's explicit `target`, not by this.
    name: entry.slug,
    type: "registry:component",
    description: entry.description,
    ...(entry.codegen.dependencies?.length
      ? { dependencies: entry.codegen.dependencies }
      : {}),
    ...(entry.codegen.devDependencies?.length
      ? { devDependencies: entry.codegen.devDependencies }
      : {}),
    files: registryFiles(COMPONENTS_DIR, entry.slug),
  };
}

async function main() {
  const registry = await loadRegistry();
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error(`no entries found in ${ENTRY_FILE}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const indexItems = registry.map((entry) => ({
    name: entry.slug,
    type: "registry:component",
    title: entry.name,
    description: entry.description,
  }));

  const write = (file: string, value: unknown) => {
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(value, null, 2) + "\n");
  };

  const sources: Record<string, RegistryFile[]> = {};
  for (const entry of registry) {
    const item = toRegistryItem(entry);
    sources[entry.slug] = item.files;
    write(`${entry.slug}.json`, item);
    console.log(`registry: wrote public/r/${entry.slug}.json`);
  }

  // Only written when changed, so `npm run dev` doesn't touch a tracked file
  // (and trigger a reload) on every start.
  const sourcesModule = renderSourcesModule(sources);
  const current = fs.existsSync(SOURCES_FILE)
    ? fs.readFileSync(SOURCES_FILE, "utf8")
    : null;
  if (current !== sourcesModule) {
    fs.writeFileSync(SOURCES_FILE, sourcesModule);
    console.log(`registry: wrote src/registry/sources.generated.ts`);
  } else {
    console.log(`registry: src/registry/sources.generated.ts is up to date`);
  }

  // The CLI resolves `shadcn search @ns` / `add @ns -a` against
  // <registry-root>/registry.json, so a namespaced consumer needs this file
  // to discover what the registry contains. index.json stays for humans.
  write("registry.json", {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "anima",
    homepage: siteUrl,
    items: indexItems,
  });
  console.log(`registry: wrote public/r/registry.json`);
  write("index.json", indexItems);
  console.log(
    `registry: wrote public/r/index.json (${indexItems.length} entries)`,
  );
}

main();
