import type { OutputBundle, OutputChunk, RenderedChunk } from "rollup";
import { createFilter } from "@rollup/pluginutils";
import type { ChunkMetadata } from "vite";

declare module "rollup" {
  export interface RenderedChunk {
    viteMetadata?: ChunkMetadata;
  }
}

export const jsFilter = createFilter(["**/*-*.js"]);
export const cssFilter = createFilter(["**/*-*.css"]);

export const getRelatedCssLinks = (
  bundles: OutputBundle,
  fileName: string,
  pathTransform?: (fileName: string) => string
) => {
  const cssLinks: string[] = [];
  const importedCss =
    bundles[fileName].type === "chunk"
      ? (bundles[fileName] as RenderedChunk)?.viteMetadata?.importedCss ??
        new Set<string>()
      : new Set<string>();

  if (importedCss.size) {
    importedCss.forEach((fileName) => {
      if (bundles[fileName].type === "asset" && cssFilter(fileName))
        cssLinks.push(
          typeof pathTransform === "function"
            ? pathTransform(fileName)
            : fileName
        );
    });
  }

  return cssLinks;
};

export const addStaticImportToPreoadModules = (
  bundles: OutputBundle,
  fileName: string,
  pathTransform?: (fileName: string) => string
) => {
  const paths: Array<string> = [];
  const cssLinks: Array<string> = [];
  const imports =
    bundles[fileName].type === "chunk"
      ? (bundles[fileName] as OutputChunk).imports
      : [];

  imports.forEach((fileName) => {
    if (bundles[fileName].type === "chunk" && jsFilter(fileName)) {
      paths.push(
        typeof pathTransform === "function" ? pathTransform(fileName) : fileName
      );
      cssLinks.push(...getRelatedCssLinks(bundles, fileName, pathTransform));
    }
  });

  return [paths, cssLinks];
};
