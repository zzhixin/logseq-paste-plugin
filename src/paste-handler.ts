import { insertPlainTextFallback, insertTransformedSegments } from "./editor-service";
import { saveBase64Image } from "./file-service";
import { containsBase64Image, parseClipboardText, summarizeParsedImages } from "./parser";
import { isDebugModeEnabled } from "./settings";
import type { ParsedImageSegment } from "./types";

export function registerPasteHandler(): void {
  logseq.App.registerCommandShortcut(
    {
      mode: "editing",
      binding: "mod+v",
    },
    async () => {
      await tryHandleClipboardPaste();
    },
    {
      key: "logseq-paste-plugin-paste-from-clipboard",
      label: "Logseq Paste Plugin: Paste From Clipboard",
      desc: "Transform base64 images in clipboard content before inserting into the current block.",
    },
  );
}

export async function handleClipboardPaste(): Promise<void> {
  try {
    const clipboardText = await readClipboardText();

    if (isDebugModeEnabled()) {
      console.log("logseq-paste-plugin: clipboard shortcut triggered", {
        textPreview: clipboardText.slice(0, 120),
        textLength: clipboardText.length,
        containsBase64: containsBase64Image(clipboardText),
      });
    }

    if (!clipboardText) {
      logseq.UI.showMsg("剪贴板里没有可读取的文本内容。", "warning", {
        timeout: 2000,
      });
      return;
    }

    if (!containsBase64Image(clipboardText)) {
      await insertPlainTextFallback(clipboardText);
      return;
    }

    const result = parseClipboardText(clipboardText);
    if (!result.hasImages) {
      await insertPlainTextFallback(clipboardText);
      return;
    }

    console.group("logseq-paste-plugin: base64 paste detected");
    console.log("segments", result.segments);
    console.log("summary", summarizeParsedImages(result.segments));
    console.groupEnd();

    if (isDebugModeEnabled()) {
      logseq.UI.showMsg(
        `检测到 ${result.segments.filter((segment) => segment.type === "image").length} 张 base64 图片，开始转换。`,
        "info",
        { timeout: 2500 },
      );
    }

    await processBase64Paste(result.segments, clipboardText);
  } catch (error) {
    console.error("logseq-paste-plugin: failed to read clipboard", error);
    throw error;
  }
}

async function tryHandleClipboardPaste(): Promise<void> {
  try {
    await handleClipboardPaste();
  } catch (error) {
    console.error("logseq-paste-plugin: clipboard shortcut fallback to panel", error);
    logseq.UI.showMsg("无法直接读取系统剪贴板，请检查权限或使用普通粘贴。", "warning", {
      timeout: 3500,
    });
  }
}

async function readClipboardText(): Promise<string> {
  const clipboard = parent.navigator?.clipboard ?? navigator.clipboard;

  if (!clipboard?.readText) {
    throw new Error("Clipboard API is not available in the current context.");
  }

  return clipboard.readText();
}

async function processBase64Paste(
  segments: ReturnType<typeof parseClipboardText>["segments"],
  rawText: string,
) {
  try {
    const images = segments.filter(
      (segment): segment is ParsedImageSegment => segment.type === "image",
    );
    const savedImages = [];

    for (const image of images) {
      const savedImage = await saveBase64Image(image);
      savedImages.push(savedImage);

      if (isDebugModeEnabled()) {
        console.log("logseq-paste-plugin: saved image", savedImage);
      }
    }

    await insertTransformedSegments(segments, savedImages);

    if (isDebugModeEnabled()) {
      logseq.UI.showMsg(`已完成转换并插入 ${savedImages.length} 张图片引用。`, "success", {
        timeout: 2500,
      });
    }
  } catch (error) {
    console.error("logseq-paste-plugin: failed to transform pasted base64 images", error);
    logseq.UI.showMsg("base64 图片转换失败，已回退为普通文本粘贴。", "warning", {
      timeout: 3000,
    });
    await insertPlainTextFallback(rawText);
  }
}
