import type { UnpluginFactory } from "unplugin";
import { createUnplugin } from "unplugin";
import { transform, type Options as SWCOptions } from "@swc/core";
import { createRequire } from "node:module";

export interface Options {}

const requireModule = createRequire(import.meta.url);
const pluginPath = requireModule.resolve("evw-swc-plugin");

const parseOpts = (ext: string): SWCOptions => {
  if (ext === ".ts" || ext === ".tsx") {
    return {
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: ext.endsWith("x"),
        },
        experimental: {
          plugins: [[pluginPath, {}]],
        },
      },
    };
  }
  return {
    jsc: {
      parser: {
        syntax: "ecmascript",
        jsx: ext.endsWith("x"),
      },
      experimental: {
        plugins: [[pluginPath, {}]],
      },
    },
  };
};

export const unpluginFactory: UnpluginFactory<Options | undefined> = (
  options,
) => ({
  name: "evw-unplugin",
  transform: {
    filter: {
      id: /(.*)\.(js|ts|jsx|tsx)$/,
      code: {
        include: /import .* from ['"]evw\/(.*)['"]/,
      },
    },
    handler(code, id) {
      const ext = id.split(".").pop()!;
      return transform(code, parseOpts(ext));
    },
  },
});

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
