import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
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
