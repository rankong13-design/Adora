# Adora

面向中国跨境卖家的广告创意工作台，覆盖 **Understand → Strategize → Generate → Evaluate → Improve → Localize → Export**。在原 adpilot 项目上开发，保留 Next.js App Router、React、严格 TypeScript、原生成流式接口与精选案例。

无账号或 API Key 即可演示完整本地流程。真实 AI 使用服务端配置，用户主动选择后才发送请求。当前数据保存在浏览器，尚未接入云数据库、身份服务或广告投放。

## 运行与检查

推荐 Node.js 24 LTS（本次验证24.21.0）、npm 11。

```sh
npm ci
npm run dev
```

默认仅监听本机127.0.0.1:3000。换端口：`npm run dev -- --port 3001`。

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm start
```

测试使用 Node 原生 TypeScript 类型擦除，不调用付费接口。生产构建需 Node 服务运行，不支持将 AI 路由静态发布。不要同时在同一个 `.next` 运行开发服务与生产构建。

## 当前能力

| 页面 | 功能 |
| --- | --- |
| `/` | 当前浏览器真实 Useful Outputs / Saved / Copied / Exported / Iterated / Localized；最近项目、继续工作、项目进度 |
| `/projects/new` | 商品描述/特点、受众、市场、平台、语言、目标（含 Consideration）、六种语气、CTA、价格、优惠、场景、痛点、证据与 Pattern；草稿、Summary、校验 |
| `/projects` | 搜索、市场/平台/状态筛选、排序、复制、归档、确认删除、备份与验证导入 |
| `/projects/[id]` | 三策略方向先选后生成、Headline、15秒分镜、编辑、收藏、副本、所选方向重新生成、版本、评分、定向改进、版本/本地化比较、导出 |
| `/history` | 创意与版本历史；来源、时间、收藏、旧版本和本地化重开；同项目比较 |
| `/inspiration` | 原创教学样例、手动粘贴结构分析、12个 Pattern；带结构进入新 Brief |

支持美国、英国、日本、新加坡、印度尼西亚；英语、日语、印尼语输出。东南亚按具体国家配置。平台包括 TikTok、Instagram、Facebook。

## 界面设计

采用 Creative Studio 浅色工作台：桌面侧栏与分组导航、墨黑主按钮、原创几何封面与少量酸橙/琥珀/薰衣草色。首页、灵感、Brief、项目、历史和结果页视觉统一；手机采用紧凑顶部栏与底部导航。生成后当前策略可折叠，方便继续编辑广告资产。

参考 Supahero 收录的 Attio、Figma、Linear；设计取舍和来源见 [UI-DESIGN.md](docs/UI-DESIGN.md)，实际截图与验证见 [QA.md](docs/QA.md)。未引入外部模板、字体请求或新依赖。

## 5分钟演示

1. 新建项目，填入示例或商品资料；检查 Brief Summary。
2. 先比较 Pain Point / Product Demo / Lifestyle 三个策略，查看 Strategy、Hook Example、Logic、Strength、Best For；选定一个后用本地演示生成一套完整创意。
3. 编辑 Hook 并保存，查看 User Edited 新版本，预览和恢复旧版本。
4. 评分当前版本，阅读七维度理由和建议；选择 Stronger Hook 等七个聚焦目标改进，直接查看 Before / After / What Changed。旧评分归档，新版本需重新评分。
5. 选择两到三个版本或本地化副本，比较结构、已保存评分、来源、测试场景与取舍。保存此版本与收藏用途不同。
6. 选择目标市场、语言、语气，本地化后查看 Original / Localized / Changed Elements / Warnings / Adaptation Notes。
7. 导出 TXT / Markdown / JSON，在历史中筛选收藏、重开并刷新验证。
8. 灵感页分析教学例子，选择 Pattern 开始下一份 Brief。

单套重新生成使用改进区域所选处理方式。重新生成只更新所选方向，保留其他方向。编辑、改进、重新生成、恢复均追加版本；复制读取当前保存内容。编辑 Hook/CTA 仅同步仍与原文一致的首尾字幕和旁白，保留独立编辑的脚本。

Shorter / Clearer Value 的 Demo 按完整句子处理，不拆开小数价格和计量值；Shorter 保守保留含数字或已识别限制条件的句子，可能无法继续缩短，仍须人工复核。

## 质量与演示边界

- Creative Quality Score 是可复现的 heuristic-v1 七维度规则评分，附理由/建议，不核实事实，不预测 CTR/CVR 或销量。内容改变后评分失效，收藏变更不使评分失效。
- 保留原有人工事实核对与五项0–2分评审；规则评分和人工评审用途不同。
- Mock 有限模板变体，七项改进为有限表达/结构变换；不编造评价、价格、认证或性能，也不保证质量提升。
- 同语言本地化演示只调整有限拼写和 CTA；跨语言演示按 Brief 与方向重建有限模板，不是逐句翻译。用户编辑需人工核对，未知中文卖点保留审核。
- 无当地售价/汇率不自动换算原币种。商品链接不会自动读取，不运行竞品抓取器。
- 灵感例子为原创教学内容；新 Brief 只继承 Pattern，不复制广告文本。
- Anker 为非官方人工练习，不代表通用模板质量。未生成真实图片、视频或 Figma 文件。

## 保存与备份

沿用 adpilot-projects-v1，兼容旧项目与草稿。Repository 与 UI 分离，验证嵌套版本/评分/本地化/枚举；读取异常保留原数据，提供原始备份，不静默覆盖。

项目 JSON 含版本与本地化；项目页可备份全部项目并导入。导入上限10 MB，全部验证后只合并新 ID，现有项目不会覆盖。

TXT / Markdown 含 Campaign Brief、各当前创意的版本/时间/处理来源，以及本地化的原市场、实际来源版本、时间、变化与复核提醒；手动编辑和恢复不会沿用之前的 AI 来源标签，未记录的旧来源明确标注未知。JSON 保持原有完整备份格式。

批量复制或导出先完成实际操作，再一次性保存同项目的使用记录。记录中的版本与本地化来源均需有效；存储失败不会只保存部分批量记录，页面会区分已复制/已发起下载与记录保存失败。

数据属于当前浏览器与域名端口，不加密、不跨设备同步；清除浏览器数据前请备份。普通跨标签页冲突拒绝旧写入，但 localStorage 不提供数据库事务级并发保证。存储额度满时保留已有数据，操作提示错误。

## 真实 AI

复制 `.env.example` 为 `.env.local`，仅在服务端填写以下变量并重启；密钥不能使用 NEXT_PUBLIC_。

| 变量 | 用途 |
| --- | --- |
| ADORA_AI_API_KEY | 服务端供应商密钥 |
| ADORA_AI_BASE_URL | HTTPS Chat Completions 基地址 |
| ADORA_AI_MODEL | 账户支持的模型 |
| ADORA_AI_PROVIDER | 来源名称 |

/api/generate 在 direction 参数指定时提供单套生成及流式进度，保留无 direction 的旧三套协议用于兼容；/api/creative 提供单套改进、重新生成、本地化。MiMo 官方域名使用 api-key、关闭思考、流式响应；其他服务使用 Bearer 通用协议。配置就绪只确认字段存在，不能证明权限或质量。

处理同源校验、请求体上限、超时、取消、限流、认证失败、空输出、截断、结构错误。仅非空未截断但结构错误的输出尝试修正一次；失败保留原内容。所有任务及修正共用进程级每小时6次实际模型请求额度，重启后重置。取消已发送的请求仍可能计费。

本次未调用付费模型；协议与修正流程使用注入响应测试。公网启用真实 AI 前需鉴权、持久额度、成本控制，详见[部署说明](docs/DEPLOYMENT.md)。

## 结构与文档

```text
app/                 页面、API、统一样式、错误与加载页
components/          Brief、项目库、历史、编辑、比较、工作台、评审
lib/                 类型、Repository、版本、规则、评分、导出、草稿
services/ai/         Provider接口、模板实现、服务端任务协议
tests/               原生成测试与工作台行为测试
docs/                产品、路线图、架构、决策、QA、部署、Case Study
```

- [产品说明](docs/PRODUCT.md) · [路线图](docs/ROADMAP.md)
- [架构与数据模型](docs/ARCHITECTURE.md) · [决策记录](docs/DECISIONS.md)
- [QA记录](docs/QA.md) · [部署说明](docs/DEPLOYMENT.md)
- [AI Product Manager Case Study](docs/CASE_STUDY.md)

Useful Signals 仅存于当前浏览器的 Project，不补算旧行为。每个操作按源版本与本地化 ID 去重计数，Useful Outputs 是五类操作的并集；生成与收藏不算 Useful。Exported 表示发起文件下载。事件分析使用 opt-in 适配器，默认不发送遥测，适配器错误不打断创作。没有假登录、计费、团队协作或投放结果。
