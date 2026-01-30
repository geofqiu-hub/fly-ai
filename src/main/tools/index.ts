import { ToolExecutor } from './base'
import { BashTool } from './bash'
import { EditTool } from './edit'
import { GlobTool } from './glob'
import { GrepTool } from './grep'
import { ImageGenTool } from './image-gen'
import { ListDirTool } from './list-dir'
import { ReadFileTool } from './read-file'
import { WebfetchTool } from './webfetch'
import { WriteTool } from './write'

class ToolRegistry {
  private readonly tools: Map<string, ToolExecutor> = new Map()

  constructor() {
    this.registerTool(new ImageGenTool())
    this.registerTool(new ReadFileTool())
    this.registerTool(new ListDirTool())
    this.registerTool(new GrepTool())
    this.registerTool(new GlobTool())
    this.registerTool(new WebfetchTool())
    this.registerTool(new EditTool())
    this.registerTool(new WriteTool())
    this.registerTool(new BashTool())
  }

  registerTool(tool: ToolExecutor) {
    this.tools.set(tool.definition.name, tool)
  }

  getTool(name: string): ToolExecutor | undefined {
    return this.tools.get(name)
  }

  getAllTools(): ToolExecutor[] {
    return Array.from(this.tools.values())
  }

  getFunctionDeclarations() {
    return this.getAllTools().map(tool => tool.definition)
  }
}

export const toolRegistry = new ToolRegistry()
