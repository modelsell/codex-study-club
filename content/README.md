# Codex Study Club 内容目录

网站的可维护内容统一存放在本目录。页面组件只负责读取和展示，不在 TSX 文件中保存文章正文。

## 目录结构

```text
content/
├── assistant/             # 首页对话助手的本地知识
├── cases/                 # 实战案例
│   ├── getting-started/   # 新手入门
│   ├── development/       # 开发与自动化
│   ├── content-design/    # 内容与设计
│   ├── knowledge/         # 知识与协作
│   └── tools-devices/     # 工具与设备
├── community-updates/     # 社群动态
└── tutorials/             # 系统教程
```

## 案例格式

```yaml
---
title: "案例标题"
description: "用于列表和 SEO 的摘要"
level: "初学者"
surface: "Codex App"
duration: "15 分钟"
cover: "/cases/example.webp"
imageAlt: "封面图片说明"
checkedAt: "2026-07-20"
---
```

文件所在的一级子目录就是案例分类。新增案例时不需要修改 TypeScript 数据表。

## 社群动态格式

```yaml
---
title: "动态标题"
excerpt: "列表摘要"
date: "2026-07-20"
displayDate: "07.20"
topics:
  - "主题一"
  - "主题二"
---
```

## 对话知识格式

`assistant/` 中每个文件代表一个可匹配的知识主题。`terms` 用于本地问题匹配，`sources` 用于回答后的来源链接。

```yaml
---
title: "知识主题"
terms:
  - "关键词"
sources:
  - label: "来源名称"
    href: "/站内路径或外部地址"
---
```

## 首页 Agent 如何使用内容

`lib/knowledge-base.ts` 会把以下 Markdown 自动加入本地资料库：

- `assistant/` 中的定向问答。
- `tutorials/` 中的教程。
- `cases/` 下所有分类案例。
- `community-updates/` 中的社群动态。

用户在首页提问后，系统先用标题、摘要、关键词和正文进行本地相关度检索，只把最相关的文档交给回答模型。

- 配置 `OPENAI_API_KEY` 时：模型根据召回的本地 Markdown 正文生成回答。
- 未配置 `OPENAI_API_KEY` 时：系统直接返回最相关文档的本地答案或摘要。
- 两种模式都会返回对应的站内资料链接。

不需要为案例、教程或社群动态额外建立索引记录。新增 Markdown 后，构建或重启服务即可进入资料库。

## 写作规则

- 每篇内容只保留一个一级标题。
- 页面标题和摘要放在 frontmatter，完整正文写在标题之后。
- 图片放在 `public/` 下，Markdown 使用以 `/` 开头的站内路径。
- 外部产品事实需要注明核对日期，并优先引用官方资料。
- 不在公开内容中写入 API Key、密码、真实用户数据或未经脱敏的群聊信息。
