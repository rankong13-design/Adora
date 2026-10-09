# 架构

保留 Next.js App Router、TypeScript、React 和 Tailwind 4。没有引入状态管理框架或新数据库。

```text
app/               Dashboard、Brief、Workspace、Projects、History、Inspiration
app/api/           generate（NDJSON）与 creative（改进 / 本地化）
components/        页面模块、Brief、编辑 dialog、比较、工作台、人工评审
lib/types.ts       向后兼容的数据类型
lib/storage.ts     校验与 ProjectRepository / LocalStorageProjectRepository
lib/creative.ts    内容快照、编辑同步、版本变换、复制、重新生成合并
lib/intelligence.ts 市场/平台规则、创意模式、分层 Prompt context
lib/score.ts       可复现 heuristic-v1 rubric
lib/draft.ts       草稿存储与校验
lib/export.ts      文本、Markdown、JSON 与下载
lib/directions.ts  三策略卡片、方向标识与旧数据映射
lib/diversity.ts   开场、创意逻辑与场景近似检查
lib/changes.ts     聚焦改进、变化项、价格与本地化提醒
lib/signals.ts     实际行为记录、版本去重与项目进度
lib/analytics.ts   可替换事件适配器
services/ai/       Provider 契约、本地改进/本地化、服务端任务、共享额度
tests/             生成流、解析、存储、版本、评分、本地化等
docs/              产品说明、QA、决策与作品集 Case Study
```

## 状态划分

ProjectProvider 仅拥有持久项目集合、加载/存储错误与 Repository 操作。Brief 本地管理 form/draft 状态。Workspace 管理选择、比较、dialog、待处理请求和反馈；AI 配置从服务器读取，API Key 从不进入浏览器。异步结果保存时带 expectedUpdatedAt，避免覆盖在另一个页面已修改/删除的项目。

Repository 是当前同步浏览器存储契约。接入远程数据库时应增加异步数据加载/提交边界与离线同步，不应把远程写入伪装为同步成功。事务式备份合并先验证全部内容，再一次写入，已存在 ID 不覆盖。localStorage 不支持跨标签页事务锁；乐观检查能识别普通过期写入，但同时写入的极小竞态仍是已知限制。

## 模型

Project 拥有 CampaignBrief、Creative 集合和 GenerationInfo。Creative 的当前文案独立于 favorite、score、versions、localizations。CreativeVersion 包含 source、label、number、时间、完整 CreativeContent 快照、变化项、处理来源，以及归档的原版本评分。Localization 保留 sourceMarket、sourceVersion、original、content、notes、changedElements、warnings、language 和 mode。评分与人工审核绑定文案快照，编辑后失效；旧评分在追加版本时归档；收藏不改变新评审的内容快照。原有整套 JSON 快照评审仍可读取，但旧式评审在元数据变化后可能需要重新保存。

原来三个固定 Creative 的存储校验扩展为 0–100 套，支持删除与副本；新流程在 Project.selectedDirection 中记录策略选择，单次只生成所选方向；无 direction 的三套 API 保留兼容。旧数据只读取校验，不批量改写。首次编辑/生成时才建立版本记录。

## AI 工作流

生成 Prompt 分为系统事实约束、产品/受众/Campaign context、市场与平台规则、模式、输出字段形状。既有 `lib/generation.ts` 保持生成协议和解析，`services/ai/tasks.ts` 承担单套改进/本地化。每次请求先验证输入、限制长度、检查来源；模型返回通过字段和连续 15 秒分镜检查后才保存。

非空、未截断但结构不合格的模型输出最多携带缺失项修正一次。认证、限流、连接失败不重试。不默默将失败的 AI 内容伪装成成功的模板结果；用户可明确选择本地演示。所有请求与修正共用进程内每小时 6 次预算，包含 MiMo 与通用 Chat Completions 适配。

## 本地 Useful Signals

Project.signals 存储类型、创意 ID、源版本 ID、可选本地化 ID、时间。复制完成后记录，导出在发起下载后记录；迭代、本地化、显式保存与内容同次写入。行为元数据不改变项目更新时间；后续内容保存合并最新信号，防止异步请求覆盖期间的复制记录。只在存储成功后更新 UI。已删除创意的行为不计入当前集合。此机制不是跨标签页事务锁。

## 未来数据库结构

推荐实体：users → projects → creatives → creative_versions；creative_scores / localizations 分别关联 creative 与 source_version。版本 content 和 brief 可为 JSON，但建立 project_id / updated_at / favorite 索引。项目所有权必须在服务端校验，删除/恢复应有事务与审计；写入用 revision 或更新时间进行并发控制。当前没有执行数据库迁移或创建云账户。

## 安全与部署

配置仅从服务端读取，不使用 NEXT_PUBLIC 密钥。React 文本渲染，无 HTML 注入、竞品 scraper 或 URL 抓取。服务端错误仅返回安全摘要；流式提前结束不算成功。默认本机绑定。公网提供真实付费 AI 前需要服务端鉴权与持久额度；当前进程限额不是生产防滥用系统。
