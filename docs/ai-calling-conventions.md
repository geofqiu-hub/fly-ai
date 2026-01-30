# FlyAI 调用流程与约定（供 AI / 开发者参考）

本文档描述项目中的**关键调用流程和约定**。修改或扩展功能时请严格遵循，避免重复纠正。

---

## 文档维护约定（AI 与开发者必读）

**凡修改了开发流程、架构、调用顺序、配置来源或本文档中描述的任一约定/行为，都必须同步更新本文档（以及 README、其他相关 docs）。**  
代码改而文档不改，会导致后续 AI 或开发者按过时信息改代码，引发重复纠正。请将「改代码 + 更新文档」视为同一次修改一并完成。

---

## 1. 模型配置来源：`gemini-models.json` 是唯一真相源

- **路径**：`src/main/config/gemini-models.json`（主进程使用）；渲染进程如需可读 `window.api.getModelConfig('gemini')`。
- **用途**：
  - 模型列表、`modelId`、`label`、`type`、`supportsTools`、`capabilities`、`titleGeneration` 等**均由此文件定义**。
  - **禁止在代码里写死模型名**（如 `gemini-2.0-flash-exp`、`gemini-1.5-flash`）做业务判断；一律从该 JSON 读取。
  - **是否传 tools（function calling）**：以 JSON 的 **`supportsTools`** 为准；图片模型等在 JSON 里为 `supportsTools: false`，provider 读到后不传 `tools`。
  - **是否支持 thinking**：以 JSON 的 **`capabilities.thinking`** 为准；为 `false` 时不传 `thinkingConfig`（如 `gemini-3-pro-image-preview`）。
- **与 DB 的关系**：设置页保存时会把「工具/思考」等能力写入 DB 的 `models.capabilities`；主进程读取配置时，**若能从 JSON 找到该 modelId 的条目，则优先用 JSON 的 `supportsTools`、`type`、`capabilities.thinking` 等**，缺省再回退到 DB。

---

## 2. 标题生成（generateTitle）

- **候选模型**：只使用 `gemini-models.json` 里 **`titleGeneration === true`** 的条目的 `modelId`。
- **流程**：
  1. IPC `generate-title` 读取 `*-models.json`，筛出 `titleGeneration === true`，得到 `titleModelIds`。
  2. 若 `titleModelIds` 为空（如配置文件未找到），则用 **当前对话的 `config.modelId`** 作为唯一候选。
  3. 在 `titleModelIds` 末尾追加**当前对话模型**（去重），作为回退：专用标题模型不可用时仍可用当前模型生成标题。
  4. Provider 按 `titleModelIds` 顺序依次尝试，**不递归**；全部失败后返回 `'New Chat'`。
- **前端**：调用 `generateTitle` 时传入的 `config.modelId` 应为**当前对话模型**（用于回退），不要传“标题专用”的 modelId。

---

## 3. 思考过程（Thinking / 思考摘要）

- **是否支持 thinking**：由 **`gemini-models.json` 中该模型的 `capabilities.thinking`** 决定。若能从 JSON 找到该 modelId 的条目，则**以 JSON 的 `capabilities.thinking` 为准**；为 **`false` 时不传** `thinkingConfig`（如 `gemini-3-pro-image-preview`），避免 API 报错或多余参数。未在 JSON 中找到时再回退到 DB 的 `models.capabilities.thinking`。
- **请求参数**：仅当 **`capabilities.thinking === true`** 时，在 `generationConfig` 中设置 `thinkingConfig`：
  - **Gemini 3**（`modelId` 以 `gemini-3-` 开头）：`{ includeThoughts: true, thinkingLevel: 'high' }`。
  - **Gemini 2.5**：`{ includeThoughts: true, thinkingBudget: -1 }`。
- **流式解析**：
  - 每个 chunk 的 `parts` 中：**`part.thought === true`** 的是思考摘要，**`part.text` 且非 thought** 的是正式回复。
  - 思考内容只发 **`thought-delta`**，**不得**拼进 `fullContent`；正式回复才拼进 `fullContent` 并发 `text-delta`。
  - 有 `parts` 时不要再用 `chunk.text()` 拼正文（否则会把思考摘要混进回复）。

---

## 4. 图片模型与「正在生成图片」提示

- **是否图片模型**：由 **`gemini-models.json` 中该模型的 `type === 'image'`** 决定，**不要**用 `modelId` 字符串或正则（如 `/image/i`）判断。
- **是否启用 function calling**：由 **`gemini-models.json` 中该模型的 `supportsTools`** 决定。provider 在读取到对应条目时，以 **`entry.supportsTools`** 为准设置 `toolsEnabled`（DB 的 capabilities.tools 仅在没有 JSON 条目时使用）。图片模型在 JSON 里均为 `supportsTools: false`，故不会传 `tools`，避免 400。
- **明确要求生成图片**：当 `isImageModel === true` 时，在 **systemInstruction** 末尾注入一句说明：「你是图片生成模型。当用户要求生成图片、画图、绘图或插图时，你必须生成并输出图片，不要仅用文字描述。」避免模型只回复文字而不出图。
- **generationConfig.responseModalities**：图片生成模型（如 `gemini-3-pro-image-preview`）必须在请求的 **generationConfig** 中设置 **`responseModalities: ['TEXT', 'IMAGE']`**，否则 API 可能无响应或只返回文字（见 [Google 图片生成文档](https://ai.google.dev/gemini-api/docs/image-generation)）。provider 在 `type === 'image'` 时自动添加该配置。
- **流程**：
  1. Provider 在 `streamChat` 开始时从同一 JSON 读取当前 `modelId` 对应条目的 `type`，若 `type === 'image'` 则设 `isImageModel = true`。
  2. 构建 `effectiveSystemPrompt` 时，若为图片模型则追加上述图片生成指令。
  3. 流式 **`start`** 事件携带：`{ modelId, isImageModel }`。
  4. 前端根据 **`event.data.isImageModel === true`** 设置 `streamingImagePending`；收到 **`file-delta`** 或 **`finish`/`error`** 时置为 false。
  5. 当 `streamingImagePending` 为 true 时，在流式正文下方显示「正在生成图片」等提示，避免用户误以为卡住。

---

## 5. 设置保存后模型列表与选中模型实时生效

- **触发**：用户在设置弹窗中保存（模型映射、API 配置等）后，会调用 `onSettingsChanged`（如 `SettingsModal` 内 `handleSaveSettings` / `handleSaveToolsSettings` 成功时）。
- **主进程**：设置已写入 DB（如 `updateModelId`、`updateModelCapabilities`）；无需主进程额外广播，渲染进程通过 `getModels()` 即可拿到最新列表。
- **渲染进程**：
  1. **App** 的 `handleSettingsChanged`：先执行 `setModelsRefreshKey(k => k + 1)`，再 `getModels()`，然后根据当前选中模型更新 `currentModel`（若存在同 slot 则用新列表中的同 slot 条目，否则用 `last_used_model` 或列表首项）。
  2. **InputArea** 接收并向下传递 **`modelsRefreshKey`** 给 **ModelSelector**。
  3. **ModelSelector** 的 `useEffect` 依赖 **`[modelsRefreshKey]`**：当该 key 变化时重新执行 `window.api.getModels()` 并更新内部 `loadedModels`，下拉列表立即显示最新映射。
- **约定**：新增或修改「设置保存后刷新 UI」的逻辑时，若涉及模型列表或当前选中模型，应通过 `modelsRefreshKey` 或等效机制触发 ModelSelector 重新拉取，避免用户需手动刷新或重启才能看到新模型映射。

---

## 6. 流式事件（StreamEvent）约定

- **类型**：`start` | `text-delta` | `thought-delta` | `file-delta` | `tool-call` | `tool-result` | `finish` | `error`。
- **start**：`data: { modelId, isImageModel }`（isImageModel 来自 config 的 `type === 'image'`）。
- **thought-delta**：仅思考摘要，不进入最终保存的正文。
- **text-delta**：正式回复片段，拼入 `fullContent` 并参与保存。
- **file-delta**：生成的图片等文件已就绪；前端可据此关闭「正在生成图片」状态。
- **error**：`data` 为错误信息（字符串或带 message 的对象）；前端应统一展示并可重试。

---

## 7. webfetch 与网络环境

- **受限域名**：Google、YouTube 等在部分网络（如大陆直连）可能不可达；列表见 `src/main/tools/webfetch.ts` 的 `COMMONLY_RESTRICTED_HOSTS`。
- **失败提示**：当 fetch 因超时/连接失败等报错，且请求的 host 属于该列表时，返回友好说明：「当前网络环境可能无法直接访问 Google 等站点。可尝试使用代理/VPN，或换用国内可访问的链接。」
- **工具描述**：webfetch 的 description 中已注明「部分网络下 Google 等站点可能不可达」，便于模型在调用时考虑替代方案。

---

## 8. 小结：禁止与推荐

| 场景           | 禁止                         | 推荐                                       |
|----------------|------------------------------|--------------------------------------------|
| 标题生成       | 写死模型名、递归 fallback    | 仅用 `titleGeneration === true` + 当前模型回退 |
| 思考过程       | 用 chunk.text() 混入思考    | 按 part.thought 分流，thought 只发 thought-delta |
| 是否传 thinkingConfig | 对所有模型都传或硬编码   | 用 JSON **`capabilities.thinking`**，为 false 则不传 |
| 图片模型判断   | 用 modelId 正则 / 字符串包含 | 用 config 中 `type === 'image'`            |
| 模型能力/类型  | 在代码里维护模型列表         | 读 `gemini-models.json`（及 DB 回退）     |
| 是否传 tools   | 用 isImageModel 等硬编码关闭 | 用 JSON 的 **`supportsTools`** 决定        |
| webfetch 报错  | 仅返回原始异常               | 对已知受限域名返回网络环境说明             |
| 设置保存后生效 | 不触发模型列表/选中态刷新    | 用 `modelsRefreshKey` 驱动 ModelSelector 重拉，并更新 App 的 currentModel |
| 文档维护       | 只改代码不更新文档           | 改流程/架构/约定后同步更新本文档及 README 等 |

新增或修改与「模型选择、标题、思考、图片、网络」相关的逻辑时，请先查阅本文档和 `src/main/config/gemini-models.json` 结构。**若因此改变了流程、架构或约定，务必同步更新本文档（及 [AGENTS.md](../AGENTS.md)、README 等），让后续 AI 与开发者始终以文档为准。**
