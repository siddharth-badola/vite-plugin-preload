import { defaultOptions, PreloadOptions } from "./options";
import { createFilter } from "@rollup/pluginutils";
import { Plugin, ResolvedConfig } from "vite";
import {
  appendToDom,
  createDom,
  createModulePreloadLinkElement,
  createStylesheetLinkElement,
  getExistingLinks,
} from "./dom-utils";
import prettier from "prettier";
import type { OutputBundle, OutputChunk } from "rollup";

const jsFilter = createFilter(["**/*-*.js"]);
const cssFilter = createFilter(["**/*-*.css"]);

const addStaticImportToPreoadModules = (
  bundles: OutputBundle,
  fileName: string,
  pathTransform?: (fileName: string) => string
) => {
  const paths: Array<string> = [];
  const imports =
    bundles[fileName].type === "chunk"
      ? (bundles[fileName] as OutputChunk).imports
      : [];

  imports.forEach((fileName) => {
    if (bundles[fileName].type === "chunk" && jsFilter(fileName))
      paths.push(
        typeof pathTransform === "function" ? pathTransform(fileName) : fileName
      );
  });

  return paths;
};

export default function VitePluginPreloadAll(
  options?: Partial<PreloadOptions>
): Plugin {
  let viteConfig: ResolvedConfig;
  const mergedOptions = { ...defaultOptions, ...options };

  return {
    name: "vite:vite-plugin-preload",
    enforce: "post",
    apply: "build",
    configResolved(config) {
      viteConfig = config;
    },
    transformIndexHtml: {
      enforce: "post",
      transform: (html, ctx) => {
        if (!ctx.bundle) {
          return html;
        }

        const dom = createDom(html);
        const existingLinks = getExistingLinks(dom);
        const additionalModulesSet: Set<string> = new Set();
        const additionalStylesheetsSet: Set<string> = new Set();

        const getRelativePath = (fileName: string) =>
          `${viteConfig.server.base ?? ""}/${fileName}`;

        for (const bundle of Object.values(ctx.bundle)) {
          const path = getRelativePath(bundle.fileName);

          if (
            existingLinks.includes(path) ||
            !mergedOptions.shouldPreload(bundle)
          ) {
            continue;
          }

          if (
            mergedOptions.includeJs &&
            bundle.type === "chunk" &&
            jsFilter(bundle.fileName)
          ) {
            if (mergedOptions.preloadStaticImportForChunks)
              addStaticImportToPreoadModules(
                ctx.bundle,
                bundle.fileName,
                getRelativePath
              ).forEach((path) => {
                if (!existingLinks.includes(path))
                  additionalModulesSet.add(path);
              });

            additionalModulesSet.add(path);
          }

          if (
            mergedOptions.includeCss &&
            bundle.type === "asset" &&
            cssFilter(bundle.fileName)
          ) {
            additionalModulesSet.add(path);
          }
        }

        const additionalModules = Array.from(additionalModulesSet).sort(
          (a, z) => a.localeCompare(z)
        );

        const additionalStylesheets = Array.from(additionalModulesSet).sort(
          (a, z) => a.localeCompare(z)
        );

        for (const additionalModule of additionalModules) {
          const element = createModulePreloadLinkElement(dom, additionalModule);
          appendToDom(dom, element);
        }

        for (const additionalStylesheet of additionalStylesheets) {
          const element = createStylesheetLinkElement(
            dom,
            additionalStylesheet
          );
          appendToDom(dom, element);
        }

        return prettier.format(dom.serialize(), { parser: "html" });
      },
    },
  };
}
