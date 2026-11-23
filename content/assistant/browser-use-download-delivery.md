---
title: "Browser Use 下载清单、最终链接与文件验收"
terms:
  - "Browser Use"
  - "result.downloads"
  - "finish_from_repl"
  - "Browser Use 下载"
  - "report (1).csv"
  - "current-report.csv"
sources:
  - label: "Browser Use 1.0.8：三组真实本地浏览器下载与交付对照"
    href: "/cases/browser-use-download-delivery-lab"
---

Browser Use 的下载清单、成功声明和当前任务文件是三个层次。本站固定 1.0.8 的三组 SDK/浏览器集成实验实际运行本地无界面 Chrome（Browser("chromium") 入口）、REPL worker 与回环 HTTP 下载；FunctionModel 工具调用、success=True 和后续修复选择均由脚本预设，不能当模型自主任务。

单次当前文件交付后，最终链接和 CSV 内容匹配。先后下载同名旧/当前报表时，文件保留为 report.csv 与 report (1).csv；故意交付旧名仍可得到 completed/success=True，但回读为 previous/7 而非 current/42。result.downloads 是本次新增文件清单，排序和第一个元素不能证明哪份属于当前任务。

在第三组中，当前文件的 URL 编码链接实际收到缺文件反馈；脚本预设复制浏览器已下载的当前文件为工作区根下的 current-report.csv，再交付并从实际最终链接回读任务标识和哈希。首次拒绝后，SDK 不会对下一次交付重复执行同等检查；后续完成不代表已经重新检查，正确性来自独立文件回读。这个稳定副本不在 downloads 目录，因此不能只拿 result.downloads 代替最终成果索引。保留来源文件到副本的哈希映射，并验证副本与当前任务相符。

文章及配套脚本只覆盖 macOS arm64 / Python 3.12 的固定版本，本地模型响应为合成。未验证真实模型、Cloud、附着用户 Chrome、Windows、生产站点或所有链接语法；不把未合并 PR 或此处对照称为上游正式修复。
