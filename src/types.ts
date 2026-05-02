export type PluginSettings = {
  assetFolder?: string;
};

export type ParsedTextSegment = {
  type: "text";
  content: string;
};

export type ParsedImageSegment = {
  type: "image";
  mimeType: string;
  extension: string;
  base64Data: string;
  originalSource: string;
  alt?: string;
};

export type ParsedSegment = ParsedTextSegment | ParsedImageSegment;

export type ParseClipboardResult = {
  segments: ParsedSegment[];
  hasImages: boolean;
};

export type SavedImage = {
  markdownPath: string;
  assetPath: string;
  mimeType: string;
  extension: string;
  alt?: string;
};
