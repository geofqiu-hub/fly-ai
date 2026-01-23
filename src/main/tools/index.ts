import { ToolExecutor } from './base'
import { ImageGenTool } from './image-gen'

class ToolRegistry {
  private tools: Map<string, ToolExecutor> = new Map()

  constructor() {
    this.registerTool(new ImageGenTool())
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
