/**
 * scripts/build-vercel.mjs
 *
 * Transforms the Vite build output (dist/) into the Vercel Build Output API
 * format (.vercel/output/) so Vercel can deploy it as a serverless function.
 *
 * Run after `vite build`:
 *   node scripts/build-vercel.mjs
 *
 * What it does:
 *   1. Copies dist/client/ → .vercel/output/static/       (static assets, CDN-served)
 *   2. Bundles dist/server/server.js + all npm deps into a single .mjs file
 *      (esbuild is already installed as part of Vite — no extra deps needed)
 *   3. Creates a thin Vercel function entry that exports server.fetch as default
 *   4. Writes .vc-config.json (Node.js 22 runtime) and config.json (routing)
 */

import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { execSync } from "child_process";

// ── 1. Clean previous Vercel output ─────────────────────────────────────────
rmSync(".vercel/output", { recursive: true, force: true });

// ── 2. Create directory structure ───────────────────────────────────────────
mkdirSync(".vercel/output/static", { recursive: true });
mkdirSync(".vercel/output/functions/index.func", { recursive: true });

// ── 3. Static assets: dist/client → .vercel/output/static ──────────────────
cpSync("dist/client", ".vercel/output/static", { recursive: true });
console.log("✓ Static assets copied");

// ── 4. Bundle the server ────────────────────────────────────────────────────
// esbuild traces all imports (local assets + npm packages) and bundles them
// into one self-contained ESM file.
// --external:node:*  keeps Node.js built-ins (async_hooks, etc.) external —
// they are provided by the Vercel Node.js runtime and must NOT be bundled.
const esbuild =
  process.platform === "win32"
    ? "node_modules\\.bin\\esbuild.cmd"
    : "node_modules/.bin/esbuild";

// Node.js built-ins must be external in both "node:" and bare forms.
// "--platform=node" handles most cases but react-dom CJS uses bare require("util")
// which esbuild doesn't always catch, so we list the common ones explicitly.
const NODE_BUILTINS = [
  "assert", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "dns", "domain", "events", "fs", "http", "http2",
  "https", "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl", "stream",
  "string_decoder", "sys", "timers", "tls", "tty", "url", "util",
  "v8", "vm", "worker_threads", "zlib",
];
const externals =
  "--external:node:* " +
  NODE_BUILTINS.map((m) => `--external:${m}`).join(" ");

execSync(
  `"${esbuild}" dist/server/server.js` +
    " --bundle" +
    " --platform=node" +
    " --target=node20" +
    " --format=esm" +
    ` --outfile=.vercel/output/functions/index.func/server.mjs` +
    ` ${externals}`,
  { stdio: "inherit" }
);
console.log("✓ Server bundled");

// ── 5. Function entry point ──────────────────────────────────────────────────
// Vercel Node.js runtime calls `export default function(request: Request)`
// and expects a `Response` back — exactly what server.fetch does.
writeFileSync(
  ".vercel/output/functions/index.func/index.mjs",
  `import app from "./server.mjs";
export default app.fetch;
`
);

// ── 6. Function runtime config ───────────────────────────────────────────────
writeFileSync(
  ".vercel/output/functions/index.func/.vc-config.json",
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      maxDuration: 30,
    },
    null,
    2
  )
);

// Required so Node.js treats the .mjs imports as ESM
writeFileSync(
  ".vercel/output/functions/index.func/package.json",
  JSON.stringify({ type: "module" }, null, 2)
);

// ── 7. Vercel routing config ─────────────────────────────────────────────────
// "handle: filesystem" serves any file that exists in /static first.
// Everything else is forwarded to the /index serverless function.
writeFileSync(
  ".vercel/output/config.json",
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("✓ Vercel output ready at .vercel/output/");
