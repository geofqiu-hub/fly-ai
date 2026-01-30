# 给 AI 助手的说明

## 必须遵守的规则

1. **先读再改**  
   修改或扩展与本项目**模型、标题生成、思考过程、图片生成、流式事件、webfetch**相关的逻辑前，请**务必先阅读** [docs/ai-calling-conventions.md](docs/ai-calling-conventions.md)，并按其中约定实现。

2. **改流程/架构必更文档**  
   只要你修改了**开发流程、架构设计、调用顺序、配置来源、约定或关键行为**，必须**同步更新相关文档**（如 `docs/ai-calling-conventions.md`、`README.md`、`docs/` 下其他说明）。  
   文档与代码不一致会导致后续 AI 或开发者按错误理解改代码，造成重复纠正。**代码和文档一起改，视为一次完整修改。**

---

## 调用流程与约定文档

**[docs/ai-calling-conventions.md](docs/ai-calling-conventions.md)** 当前说明了：

- 模型配置一律来自 **`gemini-models.json`**，禁止在代码里写死模型名。
- 标题生成只用 **`titleGeneration === true`** 的模型，并如何回退到当前对话模型。
- 思考过程如何按 **`part.thought`** 分流，避免把思考摘要混入正文。
- 图片模型如何用 **`type === 'image'`** 判断，以及 `start` 事件中的 `isImageModel`。
- 流式事件（thought-delta / text-delta / file-delta）的约定。
- **设置保存后模型列表与选中模型实时生效**：`modelsRefreshKey` 从 App 经 InputArea 传到 ModelSelector，设置保存后递增以触发重新拉取模型列表并更新当前选中模型。
- webfetch 对受限网络环境的提示方式。

遵循该文档并保持文档与代码同步，可避免重复纠正同一类问题。
