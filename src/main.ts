import "@logseq/libs";
import { registerPasteHandler } from "./paste-handler";
import { isDebugModeEnabled, SETTINGS_SCHEMA } from "./settings";

function main() {
  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  registerPasteHandler();
  logseq.App.registerCommandPalette(
    {
      key: "logseq-paste-plugin-show-status",
      label: "Logseq Paste Plugin: Show Status",
    },
    async () => {
      const graph = await logseq.App.getCurrentGraph();
      const message = graph
        ? `插件已加载，当前图谱: ${graph.name}`
        : "插件已加载，但暂时未拿到当前图谱信息";
      logseq.UI.showMsg(message, "info", { timeout: 2500 });
      console.log("logseq-paste-plugin status", { graph, settings: logseq.settings });
    },
  );

  logseq.App.registerCommandPalette(
    {
      key: "logseq-paste-plugin-show-focus",
      label: "Logseq Paste Plugin: Show Focus Element",
    },
    () => {
      const activeElement = document.activeElement;
      const payload =
        activeElement instanceof HTMLElement
          ? {
              tagName: activeElement.tagName,
              className: activeElement.className,
              contentEditable: activeElement.getAttribute("contenteditable"),
            }
          : { activeElement: String(activeElement) };

      console.log("logseq-paste-plugin focus element", payload);
      logseq.UI.showMsg("已输出当前焦点元素到控制台。", "info", { timeout: 2000 });
    },
  );

  console.log("logseq-paste-plugin loaded", {
    settings: logseq.settings,
    debugMode: isDebugModeEnabled(),
  });

  if (isDebugModeEnabled()) {
    logseq.UI.showMsg("Logseq Paste Plugin 已加载。");
  }
}

logseq.ready(main).catch((error) => {
  console.error("Failed to start logseq-paste-plugin", error);
});
