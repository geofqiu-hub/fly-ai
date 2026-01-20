# FlyAi

FlyAi 是一个模仿 Claude Code Desktop 风格的极简 AI 桌面应用。
第一期专注于 Gemini API 的集成与图片生成能力。

## ✨ 特性

- **极简设计**: 模仿 Claude 的暖色调与排版，专注于内容。
- **本地存储**: 所有的对话历史、API Key 均存储在本地 SQLite 数据库 (`~/Library/Application Support/flyai/flyai.db`)。
- **Gemini 驱动**: 支持 Gemini 1.5 Flash 模型。
- **生图 Agent**: 内置画图智能体，只需说 "Draw a cat" 或 "生成一张赛博朋克风格的图"，即可看到图片。

## 🚀 快速开始

1. **安装依赖** (如果尚未安装):
   ```bash
   npm install
   ```

2. **启动开发环境**:
   ```bash
   npm run dev
   ```
   这将同时启动 Vite 开发服务器和 Electron 窗口。

3. **构建生产版本**:
   ```bash
   npm run build
   ```

## ⚙️ 配置

首次启动后，请点击左下角的 **Settings**，输入你的 Google Gemini API Key。
(Key 仅保存在你的本地设备上，不会上传到任何服务器)

## 🛠️ 技术栈

- **Core**: Electron, React, TypeScript
- **Build**: Vite, Esbuild
- **UI**: Tailwind CSS
- **Data**: better-sqlite3
- **AI**: Google Generative AI SDK

Enjoy creating with FlyAi!
