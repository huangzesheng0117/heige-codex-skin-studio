# HeiGe Codex Skin Studio Skill

这个 Skill 面向 Windows 11 与 MSIX 版 Codex Desktop，内置 4 套自定义主题：

- 见泷原放课后
- 叛逆的物语
- 圆焰
- 名侦探光之美少女

换肤引擎只通过本机回环 CDP 注入 CSS、主题菜单、漫画功能卡片和装饰素材，不修改 Codex 官方应用文件。

下载 Release 中的 `.skill` 后可直接交给 Codex 安装；手动安装时将它作为 ZIP 解压，双击 `scripts\install.bat`。安装器默认应用“叛逆的物语”并启用当前 Windows 用户的自动加载。

v1.1.0 包含启动重试加固、持续主题健康检查、新旧页面兼容及安装失败后的自启注册修复。Release 同时提供可直接解压的 Windows `.zip`，内容与 `.skill` 相同。

新电脑请先安装并启动一次官方 Codex Desktop。主题工具优先使用客户端内置 Node；只有客户端不包含兼容运行时时，才需要另装 Node.js 22 或更新版本。安装包无需访问作者电脑上的目录。

如果当前 ChatGPT 未开启调试端口，安装器会保留会话，并在完成文件安装和自启注册后提示“主题设置待完成”；返回非零不代表文件未安装。请手动完全退出 ChatGPT，再运行：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\apply.ps1" -Theme "madoka-notebook"
```

只有显示主题健康校验成功，才表示本次主题已生效。请以发布页附件和 `SHA256SUMS.txt` 为准。
