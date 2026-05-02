# Logseq Paste Plugin

一个用于 Logseq 的粘贴增强插件。

它的作用是拦截编辑态下的 `Ctrl+V` / `Cmd+V`，识别剪贴板文本中的 base64 图片，把图片保存到当前图谱的 `assets` 目录，并在 block 中插入 Markdown 图片引用，而不是把大段 base64 原文直接粘贴进内容里。

## 使用方式

1. 在 Logseq 中进入正在编辑的 block
2. 直接按 `Ctrl+V`，macOS 下按 `Cmd+V`
3. 如果剪贴板文本中包含 `data:image/...;base64,...`
4. 插件会自动把图片写入 `assets` 目录
5. 在当前 block 中插入对应的图片引用

如果剪贴板里只是普通文本，则按普通文本插入。

## 加载方式

推荐把这个插件作为手动加载的开发插件使用。

建议做法：

1. 在 Logseq 默认插件目录旁创建一个 `dev-plugin` 文件夹
2. 在 `dev-plugin` 中创建一个插件目录，例如 `logseq-paste-plugin`
3. 执行 `npm run build`
4. 把 `dist` 中的文件复制到这个插件目录
5. 在 Logseq 中开启 `Developer mode`
6. 打开插件页
7. 选择 `Load unpacked plugin`
8. 选择刚才的插件目录

不要删除当前被 Logseq 手动加载的插件目录，因为 Logseq 运行时会直接依赖其中的文件。

## 限制

1. 这个插件当前更适合作为手动加载的开发插件使用
2. 在当前环境下，手动加载的 unpacked plugin 可以读取剪贴板，但放到默认插件目录后，剪贴板读取不稳定
3. 当前主要支持剪贴板文本中包含 base64 图片的场景，不保证覆盖所有复杂富文本来源
