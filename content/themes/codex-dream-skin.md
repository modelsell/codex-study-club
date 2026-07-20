---
title: "Codex 主题"
description: "浏览 Codex Dream Skin 主题效果，并在 macOS 或 Windows 上完成安装、换图、验证与恢复。"
checkedAt: "2026-07-20"
---

# Codex 主题

这里集中展示开源项目 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 根目录 README 中的全部展示图片，并整理一套可以直接执行的双平台安装流程。

项目通过只监听本机回环地址的 Chromium DevTools Protocol（CDP）给官方 Codex Desktop 加载外部主题，不修改 `.app`、`app.asar`、WindowsApps 或官方签名。它是社区维护的非官方项目，与 OpenAI 没有隶属、赞助或背书关系。

## 实测主题

<div class="theme-gallery">
  <figure>
    <img src="/themes/codex-dream-skin/dream-skin-demo.png" alt="抽象红白主题在 Codex Desktop 中的实机效果" loading="lazy">
    <figcaption>抽象红白主题 · Codex Desktop 实机效果</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/dream-skin-background.png" alt="抽象红白主题纯背景素材" loading="lazy">
    <figcaption>抽象红白主题 · 可用作首页横幅的纯背景</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/gothic-void-background.jpg" alt="Gothic Void Crusade 哥特科幻主题背景" loading="lazy">
    <figcaption>Gothic Void Crusade · 原创哥特科幻背景</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/gothic-void-preview.jpg" alt="Gothic Void Crusade 在 Codex Desktop 中的实机效果" loading="lazy">
    <figcaption>Gothic Void Crusade · Codex Desktop 实机效果</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/arina-hashimoto-light.jpg" alt="桥本有菜主题在 Codex Desktop 中的浅色实机效果" loading="lazy">
    <figcaption>桥本有菜主题 · 浅色实机效果，仅供预览</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/arina-hashimoto-dark.jpg" alt="桥本有菜主题在 Codex Desktop 中的暗色实机效果" loading="lazy">
    <figcaption>桥本有菜主题 · 暗色实机效果，仅供预览</figcaption>
  </figure>
</div>

::: warning 素材说明
桥本有菜主题图片是上游维护者提供的 AI 示例，已被上游明确排除在 MIT 软件许可之外，只能作为效果预览，不能当作背景图导入。人物、艺人、角色、模型输出和第三方素材的公开传播或商业使用需要独立确认权利；图片展示不代表 OpenAI、Codex 或图中人物的参与和认可。
:::

## 概念效果图

下面 8 张图片完整对应原项目 README 的概念图库。它们用于表达视觉方向，图片里已经包含侧栏、卡片、输入框和文字，不是可以直接导入的纯背景素材。

<div class="theme-gallery">
  <figure>
    <img src="/themes/codex-dream-skin/skin-01.jpg" alt="粉系定制 Codex 主题概念效果" loading="lazy">
    <figcaption>01 · 粉系定制</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-02.jpg" alt="财神打工 Codex 主题概念效果" loading="lazy">
    <figcaption>02 · 财神打工版</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-03.jpg" alt="红白科幻 Codex 主题概念效果" loading="lazy">
    <figcaption>03 · 红白科幻</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-04.jpg" alt="清透定制 Codex 主题概念效果" loading="lazy">
    <figcaption>04 · 清透定制</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-05.jpg" alt="灵感小宇宙 Codex 主题概念效果" loading="lazy">
    <figcaption>05 · 灵感小宇宙</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-06.jpg" alt="紫夜限定 Codex 主题概念效果" loading="lazy">
    <figcaption>06 · 紫夜限定</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-07.jpg" alt="青蓝虚拟歌姬 Codex 主题概念效果" loading="lazy">
    <figcaption>07 · 青蓝虚拟歌姬</figcaption>
  </figure>
  <figure>
    <img src="/themes/codex-dream-skin/skin-08.jpg" alt="舞台黑金 Codex 主题概念效果" loading="lazy">
    <figcaption>08 · 舞台黑金</figcaption>
  </figure>
</div>

需要制作同类主题时，应先根据原项目的[参考生图提示词](https://github.com/Fei-Away/Codex-Dream-Skin/blob/main/docs/reference-background-prompt-guide.md)生成无 UI、无文字的 `2560 × 1440` 纯背景，再通过主题工具导入。

## 安装前准备

获取最新源码：

```bash
git clone https://github.com/Fei-Away/Codex-Dream-Skin.git
cd Codex-Dream-Skin
```

| 平台 | 必要条件 |
| --- | --- |
| macOS | 已安装并至少启动过一次官方 Codex Desktop；存在 `~/.codex/config.toml` |
| Windows | 从 Microsoft Store 安装并注册到当前用户的官方 `OpenAI.Codex`；Node.js 22+；PowerShell 5.1+ |

安装前完全退出 Codex。先使用项目自带主题确认安装与恢复流程正常，再导入自己的图片。

## macOS 安装

```bash
cd macos
./scripts/install-dream-skin-macos.sh --no-launch
~/.codex/codex-dream-skin-studio/scripts/start-dream-skin-macos.sh
```

导入自己的纯背景：

```bash
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh \
  --image "/完整路径/your-background.png" \
  --name "My theme"
```

切换到 Gothic Void Crusade：

```bash
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh \
  --id preset-gothic-void-crusade
```

## Windows 安装

在 PowerShell 中进入源码的 `windows` 目录：

```powershell
cd .\windows
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-dream-skin.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dream-skin.ps1 -PromptRestart
```

安装完成后，可以从 `Codex Dream Skin - Tray` 导入背景、保存当前主题、切换已保存主题，或暂停主题显示。

## 背景图建议

- 推荐 `2560 × 1440` 的 16:9 图片。
- 左侧约 50% 到 58% 保持低对比、少细节，把主体放在偏右区域。
- 使用纯背景，不要包含窗口边框、侧栏、按钮、输入框、可读文字、Logo 或水印。
- 导入他人作品、角色图片或人物照片之前，先确认你拥有使用和传播这些素材的权利。

## 验证与恢复

换皮后要确认侧栏、项目菜单、任务正文和输入框仍然可读、可点击，页面没有横向溢出，CDP 只监听 `127.0.0.1`。

macOS 可以使用桌面的 `Codex Dream Skin - Verify.command` 和 `Codex Dream Skin - Restore.command`。Windows 验证命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-dream-skin.ps1 `
  -ScreenshotPath "$env:TEMP\codex-dream-skin.png"
```

Windows 恢复官方外观：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore-dream-skin.ps1 `
  -RestoreBaseTheme -PromptRestart
```

主题运行期间不要启动来源不明的本机软件。用完恢复官方外观可以同时关闭 Dream Skin 调试会话。

## 项目与反馈

- [项目源码与完整图库](https://github.com/Fei-Away/Codex-Dream-Skin)
- [问题反馈](https://github.com/Fei-Away/Codex-Dream-Skin/issues/new/choose)

本文基于上游提交 `e776fa6d5361a2bdd5c1614674397681e7b00874` 整理，最后核对日期为 2026-07-20。提交问题时不要上传 API Key、`auth.json`、中转 token 或私人对话内容。
