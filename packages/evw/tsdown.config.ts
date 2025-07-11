import { defineConfig } from "tsdown";

export default defineConfig([
  // Core APIs
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["cjs", "esm"],
    external: ["evw/async-context"],
    tsconfig: "./tsconfig.build.json",
    dts: true,
    sourcemap: true,
  },
  // Core APIs - Browser ESM
  {
    entry: ["src/index.ts"],
    outDir: "dist/browser",
    tsconfig: "./tsconfig.browser.build.json",
    platform: "browser",
    format: ["esm"],
    sourcemap: true,
  },
  // Global APIs
  {
    entry: ["src/global/index.ts"],
    outDir: "global",
    format: ["cjs", "esm"],
    tsconfig: "./tsconfig.build.json",
    dts: true,
    sourcemap: true,
  },
  // Electron APIs
  {
    entry: [
      "src/electron/index.electron.ts",
      "src/electron/index.preload.ts",
      "src/electron/index.renderer.ts",
    ],
    outDir: "global",
    format: ["cjs", "esm"],
    tsconfig: "./tsconfig.build.json",
    dts: true,
    sourcemap: true,
  },
  // Async Context APIs
  {
    entry: ["src/async-context/*.ts"],
    outDir: "async-context",
    format: ["cjs", "esm"],
    tsconfig: "./tsconfig.build.json",
    dts: true,
    sourcemap: true,
  },
]);
