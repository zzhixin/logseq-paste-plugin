import type { ParsedSegment, SavedImage } from "./types";

export async function insertTransformedSegments(
  segments: ParsedSegment[],
  savedImages: SavedImage[],
  options?: {
    newlineToBlocks?: boolean;
  },
): Promise<void> {
  const content = renderSegmentsToMarkdown(segments, savedImages, options);
  await insertContent(content, options);
}

export async function insertPlainTextFallback(
  content: string,
  options?: {
    newlineToBlocks?: boolean;
  },
): Promise<void> {
  await insertContent(content, options);
}

async function insertContent(
  content: string,
  options?: {
    newlineToBlocks?: boolean;
  },
): Promise<void> {
  const normalizedContent = content.replace(/\r\n?/g, "\n");

  if (options?.newlineToBlocks && normalizedContent.includes("\n")) {
    await insertContentAsBlocks(normalizedContent);
    return;
  }

  await logseq.Editor.insertAtEditingCursor(content);
}

function renderSegmentsToMarkdown(
  segments: ParsedSegment[],
  savedImages: SavedImage[],
  options?: {
    newlineToBlocks?: boolean;
  },
): string {
  let imageIndex = 0;
  let output = "";

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];

    if (segment.type === "text") {
      output += segment.content;
      continue;
    }

    const nextSegment = segments[segmentIndex + 1];

    const image = savedImages[imageIndex];
    imageIndex += 1;

    if (!image) {
      continue;
    }

    const altText = sanitizeAltText(image.alt);
    const imageMarkdown = `![${altText}](${image.markdownPath})`;
    output += options?.newlineToBlocks
      ? withBlockSpacing(output, imageMarkdown, nextSegment)
      : withReadableSpacing(output, imageMarkdown, nextSegment);
  }

  return output.trimEnd();
}

async function insertContentAsBlocks(content: string): Promise<void> {
  const currentBlock = await logseq.Editor.getCurrentBlock();
  const editingContent = await logseq.Editor.getEditingBlockContent();
  const cursorPosition = await logseq.Editor.getEditingCursorPosition();

  if (!currentBlock || editingContent == null || !cursorPosition) {
    await logseq.Editor.insertAtEditingCursor(content);
    return;
  }

  const blockChunks = splitContentIntoBlockChunks(content);
  if (blockChunks.length === 1) {
    await logseq.Editor.insertAtEditingCursor(content);
    return;
  }

  const prefix = editingContent.slice(0, cursorPosition.pos);
  const suffix = editingContent.slice(cursorPosition.pos);

  await logseq.Editor.updateBlock(currentBlock.uuid, `${prefix}${blockChunks[0]}`);

  let previousBlockUuid = currentBlock.uuid;

  for (let index = 1; index < blockChunks.length; index += 1) {
    const isLastLine = index === blockChunks.length - 1;
    const blockContent = isLastLine ? `${blockChunks[index]}${suffix}` : blockChunks[index];
    const insertedBlock = await logseq.Editor.insertBlock(previousBlockUuid, blockContent, {
      sibling: true,
      focus: isLastLine,
    });

    if (insertedBlock?.uuid) {
      previousBlockUuid = insertedBlock.uuid;
    }
  }
}

function splitContentIntoBlockChunks(content: string): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let currentChunkLines: string[] = [];
  let fenceMarker: "```" | "~~~" | null = null;
  let inMathBlock = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    currentChunkLines.push(line);

    if (fenceMarker) {
      if (trimmed.startsWith(fenceMarker)) {
        fenceMarker = null;
      }
    } else if (inMathBlock) {
      if (trimmed === "$$") {
        inMathBlock = false;
      }
    } else if (trimmed.startsWith("```")) {
      fenceMarker = "```";
    } else if (trimmed.startsWith("~~~")) {
      fenceMarker = "~~~";
    } else if (trimmed === "$$") {
      inMathBlock = true;
    }

    const nextLineExists = index < lines.length - 1;
    const shouldCloseChunk = !nextLineExists || (!fenceMarker && !inMathBlock);

    if (shouldCloseChunk) {
      chunks.push(currentChunkLines.join("\n"));
      currentChunkLines = [];
    }
  }

  if (currentChunkLines.length > 0) {
    chunks.push(currentChunkLines.join("\n"));
  }

  return chunks;
}

function withReadableSpacing(
  currentOutput: string,
  imageMarkdown: string,
  nextSegment?: ParsedSegment,
): string {
  const prefix = currentOutput.length > 0 && !/\s$/.test(currentOutput) ? "\n\n" : "";
  const suffix = nextSegment?.type === "text" && nextSegment.content.startsWith("\n") ? "" : "\n\n";
  return `${prefix}${imageMarkdown}${suffix}`;
}

function withBlockSpacing(
  currentOutput: string,
  imageMarkdown: string,
  nextSegment?: ParsedSegment,
): string {
  const prefix = currentOutput.length > 0 && !currentOutput.endsWith("\n") ? "\n" : "";
  const suffix = nextSegment?.type === "text" && nextSegment.content.startsWith("\n") ? "" : "\n";
  return `${prefix}${imageMarkdown}${suffix}`;
}

function sanitizeAltText(alt?: string): string {
  return (alt ?? "").replace(/\]/g, "\\]");
}
