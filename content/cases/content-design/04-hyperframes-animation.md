---
title: "Codex + HyperFrames：一句话生成动画视频"
description: "从安装 HyperFrames 到编写提示词、预览、迭代和导出 MP4，复现用 Codex 制作“人类编程进化史”动画视频的完整流程。"
level: "初学者"
surface: "Codex App"
duration: "20 分钟"
cover: "/cases/hyperframes/human-programming-evolution-poster.jpg"
imageAlt: "HyperFrames 生成人类编程进化史视频的画面"
checkedAt: "2026-07-21"
---

# Codex + HyperFrames：一句话生成动画视频

::: tip 最后核对
资料最后核对日期：2026-07-21。本文根据[爱丽丝呀发布的演示帖](https://x.com/BTCqzy1/status/2051866228646691321)、[HyperFrames 官方文档](https://hyperframes.heygen.com/quickstart)与[官方开源仓库](https://github.com/heygen-com/hyperframes)整理。HyperFrames 的插件入口、Skill 数量与命令可能继续更新，请以官方文档为准。
:::

这篇案例复现一个很具体的工作流：在 Codex 中安装 HyperFrames，用自然语言描述视频，再通过连续对话修改动效、文案、字幕和声音，最后得到可播放的 MP4。

原帖的示例先录下了安装插件和输入任务的过程，随后展示了一段“人类编程进化史”动画。完整视频已经保存到本站，可直接播放：

<figure class="markdown-video">
  <video controls playsinline preload="metadata" poster="/cases/hyperframes/human-programming-evolution-poster.jpg">
    <source src="/cases/hyperframes/human-programming-evolution.mp4" type="video/mp4">
    你的浏览器暂不支持 HTML5 视频，请使用下方原帖链接观看。
  </video>
  <figcaption>原帖演示：在 Codex 中安装 HyperFrames，并生成“人类编程进化史”动画视频。来源：爱丽丝呀。</figcaption>
</figure>

## HyperFrames 到底做了什么

HyperFrames 是 HeyGen 开源的代码化视频框架。它把视频写成 HTML，使用 CSS、媒体文件和可跳转到任意时间点的动画来组织画面，再通过无头浏览器逐帧捕获，交给 FFmpeg 编码成 MP4。

它适合 AI Agent 的原因很直接：Codex 本来就擅长写 HTML、CSS 和 JavaScript，因此可以同时处理脚本、画面、时间轴和渲染命令。它不是传统时间轴剪辑软件，也不是输入一句话后完全不可编辑的黑盒生成器；产物仍然是本地代码和素材，可以继续检查、修改与批量渲染。

| 工具 | 主要创作方式 | 更适合什么任务 |
| --- | --- | --- |
| HyperFrames | HTML + CSS + 可定位时间的动画 | 网页转视频、产品宣传、数据动画、字幕与批量内容 |
| Remotion | React 组件 | 已有 React 工程、组件化视频与成熟的 React 工作流 |
| 传统剪辑软件 | 可视化时间轴 | 精细手工剪辑、复杂调色与大量人工镜头调整 |

## 开始前准备

本地渲染需要：

- Node.js 22 或更高版本。
- npm 或 Bun。
- FFmpeg。
- 一个单独的项目目录，以及你有权使用的图片、视频、字体和音频素材。

可以先让 Codex 检查环境：

```text
请检查当前电脑是否已经安装 Node.js 22+、npm 和 FFmpeg。
只报告版本与缺失项，不要修改环境；如果缺少依赖，再给我对应系统的安装命令。
```

不要把“能生成画面”和“素材可商用”混为一谈。品牌 Logo、音乐、字体、人物照片和配音模型都要单独确认授权。

## 1. 安装插件或 Skills

### 在 Codex App 中安装插件

打开 Codex 左侧的插件入口，搜索 **HyperFrames by HeyGen**，核对开发者为 **HeyGen**、仓库指向 `heygen-com/hyperframes` 后再安装。

![在 Codex 插件列表中搜索 HyperFrames](/imported/codexguide/hyperframes-plugin-search-a8fdbe41b1.png)

界面名称可能随 Codex 版本变化。如果暂时看不到插件入口，可以使用官方 Skills 安装方式。

### 使用命令安装 Skills

交互式安装：

```bash
npx skills add heygen-com/hyperframes --full-depth
```

安装器默认不会预选内容。第一次使用时选择 **Core Skills** 即可，核心入口是 `/hyperframes`，它会根据任务把请求路由到产品宣传、无人物解说、动效、字幕或通用视频等工作流。

让 Agent 或非交互任务自动安装核心 Skills 时，使用：

```bash
npx hyperframes skills update
```

安装完成后，新建一个 Codex 任务，明确写出“请使用 `/hyperframes`”。这样比只说“帮我做视频”更容易稳定进入正确工作流。

## 2. 把一句话扩成可执行 Brief

原帖里输入的是“帮我做一个人类编程进化史的视频”。这句话可以启动任务，但没有定义时长、画幅、叙事节奏和验收标准。为了减少反复修改，建议第一次就把这些信息补齐：

```text
请使用 /hyperframes 制作一条“人类编程进化史”横屏动画视频。

要求：
- 16:9，1920x1080，约 45 秒，30 fps。
- 分为穿孔卡、汇编、C 语言、互联网、开源协作和 AI 编程六个阶段。
- 每个阶段显示年代、标题和一句不超过 18 个汉字的说明。
- 视觉从纸张与复古终端逐步过渡到现代界面，转场连贯，不使用花哨装饰。
- 使用可商用或我提供的本地素材；缺少素材时先列清单，不要擅自下载版权不明的内容。
- 先输出脚本和分镜供我确认，再生成 HTML composition。
- 生成后运行 lint、check 和 preview；确认无文字溢出、黑帧和音画不同步后再渲染 MP4。
- 最后告诉我项目目录、预览方式、成片路径和实际时长。
```

如果你提供了一篇文章、产品网站或 PR 链接，也要说明哪些内容必须保留。HyperFrames 可以从多种输入制作视频，但 Codex 不会自动知道你的传播重点。

## 3. 先确认脚本和分镜

视频一旦进入逐帧渲染，返工成本会高于修改文本。先检查 Codex 给出的脚本与分镜：

1. 每一幕是否只有一个重点。
2. 屏幕文案能否在对应时长内读完。
3. 年代、数据和引用是否可核对。
4. 画面是否依赖缺失或无授权素材。
5. 旁白、字幕和镜头时长是否一致。

确认后再让 Codex 创建 composition。项目通常包含 `index.html`、`compositions/`、`assets/` 和元数据文件；具体结构以当前 CLI 生成结果为准。

![Codex 根据书面内容创建 HyperFrames 视频](/imported/codexguide/hyperframes-book-content-prompt-e7c5fa44ef.png)

## 4. 预览并逐项修改

手动创建项目时，官方 CLI 的基本流程是：

```bash
npx hyperframes init my-video
cd my-video
npx hyperframes preview
npx hyperframes render
```

如果是 Codex 创建的项目，可以直接要求它执行同样的预览、检查和渲染流程。第一次预览重点检查：

- 首帧是否清楚说明主题。
- 中文字体是否加载成功，有没有方框或回退字体。
- 标题、字幕和安全边距是否在横屏与移动端播放器中可读。
- 动画能否定位到任意时间点，而不是只依赖真实时间流逝。
- 音频、转场与场景切换是否对齐。
- 最后是否有多余黑帧或声音被截断。

![Codex 返回本地视频项目与结果路径](/imported/codexguide/hyperframes-local-output-summary-82d208d956.png)

不要用“再高级一点”这种无法验收的反馈。一次只修改一类问题，并写清时间点和预期结果：

```text
请继续修改当前 HyperFrames 项目，不要重建项目。

1. 00:08-00:14 的标题向下移动 48px，避免遮挡年份。
2. 所有中文说明限制为两行，每行最多 12 个汉字；溢出时缩短文案，不要缩小到 28px 以下。
3. 互联网章节延长 1.5 秒，后续镜头整体顺延。
4. 保留现有配色和音乐，其余画面不要改。

修改后重新运行 lint 和 check，生成预览，并列出实际改动的文件。
```

![继续用明确反馈迭代 HyperFrames 视频](/imported/codexguide/hyperframes-refinement-prompt-5f6fd0f5c1.png)

## 5. 渲染与验收

成片导出后，不要只确认“命令成功”。让 Codex 再做一次文件级和画面级检查：

```text
请验证最终 MP4：
- 文件能够被 ffprobe 读取；
- 分辨率为 1920x1080，包含 H.264 视频流和 AAC 音频流；
- 实际时长与脚本一致；
- 抽取首帧、中间帧和尾帧，确认没有黑帧、乱码、裁切或未加载素材；
- 完整解码一次，确认没有损坏帧。

只在全部通过后把文件标记为最终版本。
```

最终至少保留这些产物：

- 视频 Brief、脚本和分镜。
- HTML composition 与本地素材。
- 最终 MP4 和一张封面图。
- 实际使用的字体、音乐和素材来源记录。
- 渲染命令、HyperFrames 版本与验收结果。

## 批量生成时怎么做

原帖提到可以批量生成。真正适合批量化的方式，是先做一条模板并固定数据接口，再替换标题、数字、配色、图片或旁白，而不是让 Codex 每次从空白重新设计。

可以这样下任务：

```text
把当前 HyperFrames 成片整理成可复用模板：
- 把标题、日期、三个数据点、主色和图片路径移到一个 JSON 文件；
- 保持镜头时长和动画结构不变；
- 为 3 组示例数据分别渲染 MP4；
- 文件名使用 slug，失败时停止并报告具体数据项；
- 输出每个视频的时长、分辨率和文件大小汇总表。
```

先用 2 到 3 组数据验证边界，再扩大批量任务。最长标题、缺失图片、异常字符和音频长度不一致，通常最容易让模板失效。

## 能力边界

- 原帖展示了动效、转场、字幕和配音的完整效果，但不代表每个项目都能零配置一次生成。素材获取、TTS 或其他生成模型可能需要额外服务与凭证。
- HyperFrames 可以使用 GSAP、CSS、Lottie、Three.js、Anime.js 和 WAAPI 等动画方式，但动画必须可按时间定位，才能稳定逐帧渲染。
- “同一输入得到确定帧”依赖本地素材、字体和运行环境也保持稳定；外链资源失效仍会造成渲染差异。
- HyperFrames 的优势是代码可编辑、流程可自动化，不等于完全替代专业剪辑、调色和声音后期。

## 参考来源

- [原始案例与视频：爱丽丝呀的 X 帖子](https://x.com/BTCqzy1/status/2051866228646691321)
- [HyperFrames 官方 Quickstart](https://hyperframes.heygen.com/quickstart)
- [HyperFrames 官方介绍](https://hyperframes.heygen.com/introduction)
- [HeyGen HyperFrames 开源仓库](https://github.com/heygen-com/hyperframes)
- [HyperFrames 与 Remotion 对比](https://hyperframes.heygen.com/guides/hyperframes-vs-remotion)

> 本文对原帖内容进行了结构化整理和补充验证，演示视频版权归原作者所有；本站保存副本用于案例讲解与防止外链失效。如权利人要求移除，请联系本站处理。
