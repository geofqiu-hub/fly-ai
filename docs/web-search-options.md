# 网络搜索方案对比

项目已有 **Tool 机制**（如 `ImageGenTool`）和 **Gemini Provider**，网络搜索可以有两种思路：用 Gemini 原生 Google Search grounding，或自定义一个「搜索 Tool」走第三方搜索 API。

---

## 方案一：Gemini 原生 Google Search Grounding（推荐优先尝试）

**思路**：在请求里开启 `google_search` 工具，由模型自动决定何时搜、搜什么，并返回带引用的回答。

| 项目 | 说明 |
|------|------|
| **优点** | 无需额外 API Key、与模型深度集成、自动引用来源、支持流式 |
| **缺点** | 当前项目用的是 `@google/generative-ai`，官方 grounding 示例基于 `@google/genai`，需确认/适配 |
| **计费** | Gemini 3 按搜索次数计费；Gemini 2.5 及更早按 prompt 计费 |

**实现要点**：

- 官方文档：[Grounding with Google Search](https://ai.google.dev/gemini-api/docs/grounding)
- 请求里增加：`tools: [{ googleSearch: {} }]`（新 SDK）或 REST 里 `tools: [{ google_search: {} }]`
- 你已有 `gemini-models.json` 里的 `grounding: true`，可据此在「支持 grounding 的模型」上开启该 tool

**适配当前项目**：

- 若继续用 `@google/generative-ai`：查其文档/类型定义是否支持 `googleSearch`/`google_search`；若支持，在 `gemini-provider.ts` 里在 `getGenerativeModel()` 或 `generateContentStream()` 的 `tools` 中加上 grounding tool（与现有 `functionDeclarations` 可并存）。
- 若改用 `@google/genai`：按官方 JS 示例接入，流式需用新 SDK 的流式 API 并和现有 `StreamEvent` 对接。

---

## 方案二：自定义 Web Search Tool + 第三方搜索 API（最稳妥、可控）

**思路**：新增一个 Tool（如 `web_search`），由模型通过 Function Calling 在需要时调用；Tool 内部请求第三方搜索 API，把摘要/片段返回给模型。

| 项目 | 说明 |
|------|------|
| **优点** | 与现有 `ImageGenTool` 一致，无需改 Gemini SDK；可自选搜索源、限频、缓存；所有「支持 tools」的模型都能用 |
| **缺点** | 需要单独配置并保管一个搜索 API Key |

**推荐第三方 API（选一个即可）**：

| 服务 | 特点 | 适用场景 |
|------|------|----------|
| **Serper** (serper.dev) | 基于 Google 结果、按次计费、有免费额度、接入简单 | 首选，性价比高 |
| **Tavily** (tavily.com) | 面向 AI Agent 优化，结果已做摘要 | 希望少 token、回答更稳 |
| **Brave Search API** | 隐私向、独立索引 | 不想依赖 Google 系 |
| **SerpAPI** | 功能多、价格偏高 | 需要更多搜索类型时 |

**实现要点**：

1. 在 `src/main/tools/` 下新增 `web-search.ts`，实现 `ToolExecutor`：
   - `definition`: 例如 `name: 'web_search'`，`parameters.query`（搜索关键词）
   - `execute`: 用 `fetch` 调所选 API，把返回的标题/摘要/snippet 拼成一段文字，`return { content: "..." }` 供模型使用
2. 在 `src/main/tools/index.ts` 的 `ToolRegistry` 里 `registerTool(new WebSearchTool())`
3. 搜索 API Key 建议：从环境变量或与 Gemini 类似的「设置 → API Config」里读（例如为 `serper` / `tavily` 单独存一份），不要在代码里写死

这样模型在对话中需要「查最新信息」时会主动调用 `web_search`，和现有图片生成流程一致。

---

## 建议选择

- **想最少改动、且主要用 Gemini 2.5/3**：优先试 **方案一**（在支持 grounding 的模型上开启 `google_search`），需确认或小幅改 `@google/generative-ai` / 或迁到 `@google/genai`。
- **想不依赖 Gemini 版本、可换模型、或必须自控搜索源与成本**：用 **方案二**，新增 `WebSearchTool` + Serper/Tavily/Brave 之一即可。

两种方案也可以并存：部分模型用原生 grounding，部分模型用自定义 `web_search`（在设置里按模型/能力开关即可）。
