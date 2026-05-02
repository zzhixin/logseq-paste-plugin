import type { ParsedImageSegment, SavedImage } from "./types";

const GRAPH_ASSET_FALLBACK_FOLDER = "assets";

export async function saveBase64Image(segment: ParsedImageSegment): Promise<SavedImage> {
  const fileName = createAssetFileName(segment.extension);
  const bytes = base64ToUint8Array(segment.base64Data);
  const graph = await logseq.App.getCurrentGraph();
  const directWriteResult = await tryWriteToGraphAssets(fileName, bytes);

  if (directWriteResult) {
    return {
      markdownPath: `../${GRAPH_ASSET_FALLBACK_FOLDER}/${fileName}`,
      assetPath: directWriteResult.absolutePath,
      mimeType: segment.mimeType,
      extension: segment.extension,
      alt: segment.alt,
    };
  }

  const storage = logseq.Assets.makeSandboxStorage();
  await storage.setItem(fileName, bytes as unknown as string);
  const assetPath = await resolveStoredAssetPath(fileName, segment.extension);

  return {
    markdownPath: toMarkdownAssetPath(assetPath, graph?.path),
    assetPath,
    mimeType: segment.mimeType,
    extension: segment.extension,
    alt: segment.alt,
  };
}

async function tryWriteToGraphAssets(
  fileName: string,
  bytes: Uint8Array,
): Promise<{ absolutePath: string } | null> {
  try {
    const graph = await logseq.App.getCurrentGraph();
    if (!graph?.path) {
      return null;
    }

    const nodeRuntime = getNodeRuntime();
    if (!nodeRuntime) {
      return null;
    }

    const assetsDir = nodeRuntime.path.join(graph.path, GRAPH_ASSET_FALLBACK_FOLDER);
    const absolutePath = nodeRuntime.path.join(assetsDir, fileName);

    await nodeRuntime.fs.mkdir(assetsDir, { recursive: true });
    await nodeRuntime.fs.writeFile(absolutePath, bytes);

    console.log("logseq-paste-plugin: image written to graph assets", {
      absolutePath,
    });

    return { absolutePath };
  } catch (error) {
    console.warn("logseq-paste-plugin: failed to write image directly to graph assets", error);
    return null;
  }
}

async function resolveStoredAssetPath(fileName: string, extension: string): Promise<string> {
  const candidates = await logseq.Assets.listFilesOfCurrentGraph(extension);
  const normalizedFileName = fileName.replace(/\\/g, "/");

  const matched = [...candidates]
    .reverse()
    .find((file) => file.path.replace(/\\/g, "/").endsWith(`/${normalizedFileName}`));

  if (matched) {
    return matched.path;
  }

  return `${GRAPH_ASSET_FALLBACK_FOLDER}/${normalizedFileName}`;
}

function createAssetFileName(extension: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  return `paste-${timestamp}-${randomSuffix}.${extension}`;
}

function base64ToUint8Array(base64Data: string): Uint8Array {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toMarkdownAssetPath(assetPath: string, graphPath?: string): string {
  const normalizedPath = assetPath.replace(/\\/g, "/").replace(/^\.?\//, "");
  const normalizedGraphPath = graphPath?.replace(/\\/g, "/").replace(/\/$/, "");

  if (normalizedPath.startsWith("../") || normalizedPath.startsWith("/")) {
    return normalizedPath;
  }

  if (normalizedGraphPath) {
    const graphAssetsPrefix = `${normalizedGraphPath}/${GRAPH_ASSET_FALLBACK_FOLDER}/`;

    if (normalizedPath.startsWith(graphAssetsPrefix)) {
      const relativeAssetPath = normalizedPath.slice(normalizedGraphPath.length + 1);
      return `../${relativeAssetPath}`;
    }
  }

  if (normalizedPath.startsWith("assets/")) {
    return `../${normalizedPath}`;
  }

  const assetsIndex = normalizedPath.lastIndexOf(`/${GRAPH_ASSET_FALLBACK_FOLDER}/`);
  if (assetsIndex >= 0) {
    const relativeAssetPath = normalizedPath.slice(assetsIndex + 1);
    return `../${relativeAssetPath}`;
  }

  const pathParts = normalizedPath.split("/");
  const fileName = pathParts[pathParts.length - 1] ?? normalizedPath;
  return `../${GRAPH_ASSET_FALLBACK_FOLDER}/${fileName}`;
}

function getNodeRuntime():
  | {
      fs: {
        mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
        writeFile(path: string, data: Uint8Array): Promise<void>;
      };
      path: {
        join: (...paths: string[]) => string;
      };
    }
  | null {
  const hostRequire =
    (parent as typeof window & { require?: (id: string) => unknown }).require ??
    (window as typeof window & { require?: (id: string) => unknown }).require;

  if (!hostRequire) {
    return null;
  }

  const fs = hostRequire("node:fs/promises") as {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
  };
  const path = hostRequire("node:path") as {
    join: (...paths: string[]) => string;
  };

  return { fs, path };
}
