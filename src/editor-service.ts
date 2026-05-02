import type { ParsedSegment, SavedImage } from "./types";

export async function insertTransformedSegments(
  segments: ParsedSegment[],
  savedImages: SavedImage[],
): Promise<void> {
  const content = renderSegmentsToMarkdown(segments, savedImages);
  await logseq.Editor.insertAtEditingCursor(content);
}

export async function insertPlainTextFallback(content: string): Promise<void> {
  await logseq.Editor.insertAtEditingCursor(content);
}

function renderSegmentsToMarkdown(segments: ParsedSegment[], savedImages: SavedImage[]): string {
  let imageIndex = 0;
  let output = "";

  for (const segment of segments) {
    if (segment.type === "text") {
      output += segment.content;
      continue;
    }

    const image = savedImages[imageIndex];
    imageIndex += 1;

    if (!image) {
      continue;
    }

    const altText = sanitizeAltText(image.alt);
    const imageMarkdown = `![${altText}](${image.markdownPath})`;
    output += withReadableSpacing(output, imageMarkdown);
  }

  return output.trimEnd();
}

function withReadableSpacing(currentOutput: string, imageMarkdown: string): string {
  const prefix = currentOutput.length > 0 && !/\s$/.test(currentOutput) ? "\n\n" : "";
  return `${prefix}${imageMarkdown}\n\n`;
}

function sanitizeAltText(alt?: string): string {
  return (alt ?? "").replace(/\]/g, "\\]");
}
