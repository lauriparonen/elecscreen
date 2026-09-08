// Bundles the API into a single self-contained ESM file.
//
// Why a bundler and not plain `tsc`: `@repo/shared` is consumed as TypeScript
// source (its `exports` points at `src/index.ts`), which Vite and tsx handle but
// Node does not. A `tsc` build emits `dist/index.js` still importing
// `@repo/shared`, which resolves to a `.ts` file and dies at boot with
// ERR_UNKNOWN_FILE_EXTENSION. Bundling inlines the shared schemas and every
// runtime dependency, so the container ships one file and no node_modules.
//
// Type checking is not this script's job — `pnpm typecheck` runs tsc separately.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  logLevel: 'info',
  // Fastify (via avvio) and pg are CommonJS and call require() internally.
  // ESM has no require, so hand them one built from import.meta.url.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
});
