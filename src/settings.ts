import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: "newlineToBlocks",
    type: "boolean",
    default: true,
    title: "换行自动创建新块",
    description:
      "开启后，剪贴板文本中包含换行时，插件会在换行处创建新块，而不是插入块内换行。",
  },
  {
    key: "debugMode",
    type: "boolean",
    default: true,
    title: "Debug Mode",
    description: "Show verbose logs and lightweight status messages while testing the plugin.",
  },
];

export function isDebugModeEnabled(): boolean {
  return Boolean(logseq.settings?.debugMode ?? true);
}

export function isNewlineToBlocksEnabled(): boolean {
  return Boolean(logseq.settings?.newlineToBlocks ?? true);
}
