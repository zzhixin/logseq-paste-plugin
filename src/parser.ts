import type { ParseClipboardResult, ParsedImageSegment, ParsedSegment } from "./types";

const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

const IMAGE_DATA_URL_PATTERN =
  /data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=\r\n]+)/gi;

type MatchCandidate = {
  start: number;
  end: number;
  originalSource: string;
  alt?: string;
  mimeType: string;
  base64Data: string;
  extension: string;
};

export function containsBase64Image(text: string): boolean {
  IMAGE_DATA_URL_PATTERN.lastIndex = 0;
  return IMAGE_DATA_URL_PATTERN.test(text);
}

export function parseClipboardText(text: string): ParseClipboardResult {
  const matches = collectMatches(text);

  if (matches.length === 0) {
    return {
      segments: [{ type: "text", content: text }],
      hasImages: false,
    };
  }

  const segments: ParsedSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({
        type: "text",
        content: text.slice(cursor, match.start),
      });
    }

    segments.push({
      type: "image",
      mimeType: match.mimeType,
      extension: match.extension,
      base64Data: normalizeBase64(match.base64Data),
      originalSource: match.originalSource,
      alt: match.alt,
    });

    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({
      type: "text",
      content: text.slice(cursor),
    });
  }

  return {
    segments: mergeAdjacentTextSegments(segments),
    hasImages: true,
  };
}

function collectMatches(text: string): MatchCandidate[] {
  const matches: MatchCandidate[] = [];
  const ranges: Array<{ start: number; end: number }> = [];

  const markdownPattern =
    /!\[(?<alt>[^\]]*)\]\((?<src>data:(?<mime>image\/(?:png|jpeg|jpg|gif|webp));base64,(?<data>[A-Za-z0-9+/=\r\n]+))\)/gi;
  const htmlPattern =
    /<img\b[^>]*\bsrc=["'](?<src>data:(?<mime>image\/(?:png|jpeg|jpg|gif|webp));base64,(?<data>[A-Za-z0-9+/=\r\n]+))["'][^>]*>/gi;

  for (const match of text.matchAll(markdownPattern)) {
    const candidate = buildMatchCandidate(match, "alt");
    if (candidate) {
      matches.push(candidate);
      ranges.push({ start: candidate.start, end: candidate.end });
    }
  }

  for (const match of text.matchAll(htmlPattern)) {
    const candidate = buildMatchCandidate(match);
    if (candidate && !overlapsExistingRange(candidate.start, candidate.end, ranges)) {
      matches.push(candidate);
      ranges.push({ start: candidate.start, end: candidate.end });
    }
  }

  for (const match of text.matchAll(IMAGE_DATA_URL_PATTERN)) {
    const start = match.index;
    const originalSource = match[0];
    const mimeType = match[1]?.toLowerCase();
    const base64Data = match[2];

    if (
      start == null ||
      !mimeType ||
      !base64Data ||
      overlapsExistingRange(start, start + originalSource.length, ranges)
    ) {
      continue;
    }

    const extension = IMAGE_MIME_TO_EXTENSION[mimeType];
    if (!extension) {
      continue;
    }

    matches.push({
      start,
      end: start + originalSource.length,
      originalSource,
      mimeType,
      base64Data,
      extension,
    });
  }

  return matches.sort((left, right) => left.start - right.start);
}

function buildMatchCandidate(
  match: RegExpMatchArray,
  altGroupName?: string,
): MatchCandidate | null {
  const start = match.index;
  const originalSource = match[0];
  const src = match.groups?.src;
  const mimeType = match.groups?.mime?.toLowerCase();
  const base64Data = match.groups?.data;

  if (start == null || !src || !mimeType || !base64Data) {
    return null;
  }

  const extension = IMAGE_MIME_TO_EXTENSION[mimeType];
  if (!extension) {
    return null;
  }

  return {
    start,
    end: start + originalSource.length,
    originalSource,
    alt: altGroupName ? match.groups?.[altGroupName] : undefined,
    mimeType,
    base64Data,
    extension,
  };
}

function overlapsExistingRange(
  start: number,
  end: number,
  ranges: Array<{ start: number; end: number }>,
): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}

function mergeAdjacentTextSegments(segments: ParsedSegment[]): ParsedSegment[] {
  const merged: ParsedSegment[] = [];

  for (const segment of segments) {
    const previous = merged[merged.length - 1];

    if (segment.type === "text" && previous?.type === "text") {
      previous.content += segment.content;
      continue;
    }

    merged.push(segment);
  }

  return merged;
}

function normalizeBase64(base64Data: string): string {
  return base64Data.replace(/\s+/g, "");
}

export function summarizeParsedImages(segments: ParsedSegment[]): string {
  const images = segments.filter(
    (segment): segment is ParsedImageSegment => segment.type === "image",
  );

  if (images.length === 0) {
    return "No base64 images detected.";
  }

  return images
    .map((segment, index) => `#${index + 1} ${segment.mimeType} -> .${segment.extension}`)
    .join(", ");
}
