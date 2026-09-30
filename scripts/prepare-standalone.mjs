// Packages the Next.js `output: 'standalone'` build so it can be deployed by copying
// nothing more than `.next/standalone` — no manual `public/`/`.next/static` steps.
//
// Next.js nests the standalone `server.js` at a path that mirrors the project's location
// relative to whatever it treats as the file-tracing root (for example
// `.next/standalone/celiyoforms/devmantraforms/server.js` when the repo lives a few
// directories deep on a shared host, vs. `.next/standalone/server.js` when it doesn't).
// That nesting depth isn't something this script can assume, so it locates the real
// standalone app directory by finding the single `server.js` under `.next/standalone`
// that isn't inside a `node_modules` tree (traced dependencies can ship their own
// internal files named `server.js`), then copies `public/` and `.next/static/` into it.
//
// Run automatically via the `postbuild` npm script after `next build`. Safe to import
// for testing: only `main()` (guarded below) touches the filesystem beyond reading it.

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IGNORED_DIR_NAME = 'node_modules';

export function findServerFiles(rootDir, { maxDepth = 12 } = {}) {
  if (!existsSync(rootDir)) return [];
  const results = [];

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === IGNORED_DIR_NAME) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name === 'server.js') {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir, 0);
  return results;
}

export function findStandaloneServerDir(standaloneRoot) {
  if (!existsSync(standaloneRoot)) {
    throw new Error(
      `Standalone output directory not found at ${standaloneRoot}. ` +
        `Make sure next.config has output: 'standalone' and that \`next build\` completed successfully first.`,
    );
  }

  const matches = findServerFiles(standaloneRoot);

  if (matches.length === 0) {
    throw new Error(
      `Could not find a standalone server.js anywhere under ${standaloneRoot} (outside node_modules). ` +
        `The standalone build may not have completed correctly.`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Found ${matches.length} candidate standalone server.js files under ${standaloneRoot}, expected exactly 1:\n` +
        matches.map((match) => `  - ${match}`).join('\n') +
        `\nResolve this ambiguity manually before packaging.`,
    );
  }

  return path.dirname(matches[0]);
}

export function packageStandaloneApp(projectRoot, standaloneAppDir) {
  const publicSrc = path.join(projectRoot, 'public');
  const publicDest = path.join(standaloneAppDir, 'public');
  const staticSrc = path.join(projectRoot, '.next', 'static');
  const staticDest = path.join(standaloneAppDir, '.next', 'static');

  if (existsSync(publicSrc)) {
    mkdirSync(standaloneAppDir, { recursive: true });
    cpSync(publicSrc, publicDest, { recursive: true, force: true });
  } else {
    console.warn(`[prepare-standalone] No public/ directory found at ${publicSrc} — skipping.`);
  }

  if (!existsSync(staticSrc)) {
    throw new Error(
      `Expected client static assets at ${staticSrc} but they were not found. ` +
        `\`next build\` should have produced them — the standalone app would be missing its CSS/JS.`,
    );
  }
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true, force: true });

  return { publicDest, staticDest };
}

function main() {
  const projectRoot = process.cwd();
  const standaloneRoot = path.join(projectRoot, '.next', 'standalone');
  const standaloneAppDir = findStandaloneServerDir(standaloneRoot);
  const { publicDest, staticDest } = packageStandaloneApp(projectRoot, standaloneAppDir);

  console.log(`[prepare-standalone] Packaged standalone app at: ${standaloneAppDir}`);
  console.log(`[prepare-standalone]   public/       -> ${publicDest}`);
  console.log(`[prepare-standalone]   .next/static/ -> ${staticDest}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(`[prepare-standalone] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
