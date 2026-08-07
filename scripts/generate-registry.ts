/**
 * generate-registry.ts — exports the in-repo component entries as shadcn
 * `registry:component` JSON files plus an index, written into `public/r/` so
 * Next.js serves them and anyone can install a component with:
 *
 *   npx shadcn@latest add https://<domain>/r/<slug>.json
 *
 * Output is a build artifact (gitignored) — `npm run build` regenerates it,
 * so the published JSON can never drift from the entries in src/.
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

/** The esbuild output is CJS, so it needs a real `require` to load. */
const requireCjs = createRequire(import.meta.url);

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const COMPONENTS_DIR = path.join(SRC_DIR, "registry", "components");
const ENTRY_FILE = path.join(SRC_DIR, "registry", "index.ts");
const OUT_DIR = path.join(ROOT, "public", "r");
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

/**
 * Maps the files on disk under `src/registry/components/<slug>/` to shadcn
 * `files[]` entries. The single `.tsx` ships as `index.tsx` so the folder
 * import `@/components/<slug>` works; anything else (e.g. the CSS module)
 * ships verbatim as `registry:file` pinned to the same folder via `target`.
 * `index.ts` (the in-repo re-export) is not shipped.
 *
 * Every file gets an explicit `target`. The CLI only maps `path` to a
 * subfolder when its alias-root matching (Kc) sees a POSIX separator — on
 * Windows the resolved path keeps backslashes, the match fails, and the
 * file collapses to a bare filename under `src/components/`. An explicit
 * `target` bypasses that entirely.
 */
function registryFiles(slug: string) {
  const dir = path.join(COMPONENTS_DIR, slug);
  const files = fs
    .readdirSync(dir)
    .filter((file) => file !== "index.ts")
    .sort();

  const tsx = files.filter((file) => file.endsWith(".tsx"));
  if (tsx.length !== 1) {
    throw new Error(
      `[${slug}] expected exactly one .tsx in ${dir}, found ${tsx.length} (${files.join(", ")})`,
    );
  }
  const main = tsx[0];

  return files.map((file) => {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    if (file === main) {
      return {
        path: `components/${slug}/index.tsx`,
        type: "registry:component",
        target: `@components/${slug}/index.tsx`,
        content,
      };
    }
    return {
      path: `components/${slug}/${file}`,
      type: "registry:file",
      target: `@components/${slug}/${file}`,
      content,
    };
  });
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
    files: registryFiles(entry.slug),
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
    description: entry.description,
  }));

  const write = (file: string, value: unknown) => {
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(value, null, 2) + "\n");
  };

  for (const entry of registry) {
    write(`${entry.slug}.json`, toRegistryItem(entry));
    console.log(`registry: wrote public/r/${entry.slug}.json`);
  }
  write("index.json", indexItems);
  console.log(
    `registry: wrote public/r/index.json (${indexItems.length} entries)`,
  );
}

main();
