import type { OutputChunk, OutputAsset } from "rollup";
export interface PreloadOptions {
  includeJs: boolean;
  includeCss: boolean;
  shouldPreload: (chunkInfo: OutputChunk | OutputAsset) => boolean;
  preloadStaticImportForChunks: boolean;
}

export const defaultOptions: PreloadOptions = {
  includeJs: true,
  includeCss: true,
  shouldPreload: () => true,
  preloadStaticImportForChunks: true,
};
