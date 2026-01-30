# OpenCode 风格工具集成方案

项目已有 **Tool 机制**（`ToolExecutor` + `ToolRegistry`）和 Gemini 的 function calling 流程，OpenCode 风格的内置工具**可以按同样模式逐步集成**。

---

## 可行性概览

| 能力 | 说明 |
|------|------|
| **架构** | 已有 `ToolExecutor` 接口、`toolRegistry` 注册、Gemini 侧 `tool-call` → `execute` → `tool-result` 闭环，新增工具只需实现类并 `registerTool()`。 |
| **安全** | 只读类工具（read / list / grep / glob）风险低；写文件与执行命令需「工作区限定 + 权限/确认」后再上。 |
| **工作区** | 文件类工具需统一的「项目根路径」概念，建议在设置中增加「工作区路径」（可选），未设置时仅允许只读或禁用写/执行类工具。 |

---

## 工具与集成建议

### 一、建议优先集成（只读、风险低）

| 工具 | 说明 | 实现要点 |
|------|------|----------|
| **read_file** | 读取文件内容，支持行范围 | 路径相对工作区，校验 `path` 不逃逸工作区；大文件可只返回指定行范围。 |
| **list_dir** | 列出目录内容 | 仅限工作区下目录，可支持简单 glob。 |
| **grep** | 正则搜索文件内容 | 工作区下搜索，可复用 ripgrep 或 Node 实现，遵守 `.gitignore` 可选。 |
| **glob** | 按 glob 匹配找文件 | 工作区下匹配，返回路径列表。 |
| **webfetch** | 抓取网页内容 | 与现有 [web-search-options.md](./web-search-options.md) 中的「自定义 Web Search Tool」思路一致，可单独做 `webfetch`（只抓取 URL 内容）或与搜索合并。 |

### 二、需要「工作区 + 权限」后再集成

| 工具 | 说明 | 实现要点 |
|------|------|----------|
| **edit** | 精确字符串替换修改文件 | 必须限定在工作区；建议增加「允许/拒绝/每次询问」配置（类似 OpenCode 的 permission）。 |
| **write** | 新建或覆盖文件 | 同上，且与 edit 共用同一套写权限配置。 |
| **bash** | 执行 shell 命令 | 风险最高，建议默认关闭或仅「询问」；执行目录固定为工作区根。 |

### 三、可选或后续考虑

| 工具 | 说明 |
|------|------|
| **skill** | 加载 SKILL.md 等技能文件 | 若项目引入「技能/预设指令」再实现。 |
| **todo**（todowrite / todoread） | 会话内待办列表 | 需前端或存储配合，可放在对话压缩/会话管理之后。 |
| **question** | 执行中向用户提问 | 需前端支持「阻塞式」问答或消息流中的追问 UI。 |
| **lsp** | 与 LSP 交互 | 依赖本地 LSP 服务与语言配置，可作为实验性能力。 |

---

## 已集成工具一览

| 工具 | 说明 | 权限/范围 |
|------|------|-----------|
| **read_file** | 读取文件内容，支持行范围 | 受 file_scope / workspace_path 控制；设备范围单文件最大 2MB |
| **list_dir** | 列出目录内容，可选 pattern 过滤 | 同上 |
| **grep** | 正则搜索目录下文件内容 | 同上；最多 500 文件、5MB 总读取 |
| **glob** | 按 glob 匹配找文件 | 同上；最多 1000 个结果 |
| **webfetch** | 抓取 URL 返回文本 | 仅 http(s)，单页最大 500KB |
| **edit** | 精确字符串替换（第一处） | 需 permission_edit=allow |
| **write** | 新建或覆盖文件 | 需 permission_edit=allow |
| **bash** | 在工作区根执行 shell 命令 | 需 permission_bash=allow；输出截断 100KB，超时 60s |

设置中已提供：**文件读取范围**（仅工作区 / 整个设备）、**工作区路径**、**编辑与执行权限**（允许 edit/write、允许 bash），默认写与执行均为关闭。

---

## 代码模式（与现有工具一致）

每个工具一个类，实现 `ToolExecutor`：

```ts
// src/main/tools/read-file.ts
export class ReadFileTool implements ToolExecutor {
  definition = {
    name: 'read_file',
    description: 'Read file contents from the workspace. Path is relative to workspace root.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        startLine: { type: 'number', description: 'Optional 1-based start line' },
        endLine: { type: 'number', description: 'Optional 1-based end line' }
      },
      required: ['path']
    }
  }

  async execute(args, context) {
    const workspaceRoot = getWorkspaceRoot() // 从配置或 process.cwd() 获取
    // 解析 path，校验在工作区内，再 fs.readFile / 按行切片
    return { content: '...' }
  }
}
```

在 `src/main/tools/index.ts` 中注册：

```ts
import { ReadFileTool } from './read-file'
// ...
this.registerTool(new ReadFileTool())
```

---

## 安全要点

- **路径**：所有文件路径必须基于「工作区根」解析，并用 `path.relative(workspaceRoot, resolvedPath)` 检查不含 `..`、不越界。
- **写与执行**：仅在工作区目录内允许；`bash` 的 `cwd` 固定为工作区根；考虑命令白名单或「每次确认」。
- **权限**：可参考 OpenCode 的 `opencode.json` 的 `permission` 设计，在本地用配置文件或设置项实现 allow/deny/ask。

---

## 小结

- **可以集成**：现有架构已支持，按「只读优先 → 工作区与权限 → 写/执行」顺序推进即可。
- 已提供 **read_file** 示例实现（见 `src/main/tools/read-file.ts`），可直接扩展为 list_dir、grep、glob 等。
- 网络能力与 [web-search-options.md](./web-search-options.md) 中的方案一致，可单独做 webfetch 或与搜索 Tool 合并。
