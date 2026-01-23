export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: any
    properties: Record<string, any>
    required: string[]
  }
}

export interface ToolExecutor {
  definition: ToolDefinition
  execute(args: any, context: {
    sessionId: string
    apiKey: string
    baseUrl?: string
    onEvent?: (event: { type: string; data: any }) => void
  }): Promise<any>
}
