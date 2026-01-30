# Gemini 模型一览（示例）

> 说明：  
> - 本文档建议通过脚本 `scripts/fetch-gemini-models.js` 自动生成，而不是手工维护。  
> - 运行脚本后，这里的内容会被覆盖为「当前 Google Gemini API 返回的所有模型列表」。  
> - 当 Gemini 新增 / 下线模型时，只需要重新运行脚本即可更新。

## 如何更新本文件

1. 在终端设置环境变量并运行脚本（使用你的在线 Gemini Key）：

```bash
GEMINI_API_KEY="你的真实 API Key" node scripts/fetch-gemini-models.js
```

2. 脚本会自动：
   - 调用 `https://generativelanguage.googleapis.com/v1/models` 拉取当前所有 Gemini 模型；
   - 生成 / 覆盖：
     - `docs/gemini-models.md`（本文档，包含一个可阅读的模型表格）；
     - `src/main/models/gemini-models.json`（结构化 JSON，可供代码使用）。

3. 将更新后的文件提交到仓库，即可分享给团队其他成员。

---

> 首次添加脚本后，如果你还没有运行它，这里只是一段说明文本。  
> 一旦运行脚本，本段落会被替换为自动生成的完整模型表格。

