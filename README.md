# FlyAi

FlyAi 是一个模仿 Claude Code Desktop 风格的极简 AI 桌面应用，基于 Gemini API，支持多模型、工具调用与图片生成。

## ✨ 特性

- **极简设计**：模仿 Claude 的暖色调与排版，专注于内容。
- **本地存储**：对话历史、API Key、模型配置均存储在本地 SQLite 数据库（macOS：`~/Library/Application Support/flyai/flyai.db`）。
- **Gemini 多模型**：模型列表与能力由 `gemini-models.json` 配置，支持对话、标题生成、思考过程、图片模型等，不在代码中写死模型名。
- **生图 Agent**：内置画图智能体，说「Draw a cat」或「生成一张赛博朋克风格的图」即可出图。
- **工具调用**：支持读文件、编辑、搜索、列表、webfetch、bash、写文件等工具，便于代码与检索类任务。

## 🚀 快速开始

1. **安装依赖**（首次或依赖变更后）:
   ```bash
   npm install
   ```

2. **启动开发环境**:
   ```bash
   npm run dev
   ```
   会先启动 Vite 开发服务器，再启动 Electron 主进程与窗口。

3. **构建生产版本**:
   ```bash
   npm run build
   ```

4. **打安装包**:
   ```bash
   npm run dist
   ```

## ⚙️ 配置

首次启动后，点击左下角 **Settings**，输入 Google Gemini API Key。Key 仅保存在本机，不会上传。

## 🛠️ 技术栈

- **Core**: Electron, React, TypeScript  
- **Build**: Vite, Esbuild  
- **UI**: Tailwind CSS  
- **Data**: better-sqlite3  
- **AI**: Google Generative AI SDK  

## 📋 开发与 AI 助手

- **调用流程与约定**：修改模型、标题生成、思考过程、图片生成、流式事件或 webfetch 前，请先阅读 [docs/ai-calling-conventions.md](docs/ai-calling-conventions.md)，并按约定实现。
- **给 AI 的说明**：见项目根目录 [AGENTS.md](AGENTS.md)。改流程或架构时需同步更新相关文档。

## 📦 发布

- 本地发布流程：修改 `package.json` 版本号后执行 `./scripts/release.sh`，会提交、打 tag（如 `v2.0.0`）并推送；GitHub Actions 在推送 `v*` tag 时自动构建并发布到 Releases。

---

Enjoy creating with FlyAi!
