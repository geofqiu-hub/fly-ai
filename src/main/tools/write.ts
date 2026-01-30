import fs from 'node:fs'
import path from 'node:path'
import { getWorkspaceRoot, getFileScope, resolvePath, getPermissionEdit } from './workspace'
import { ToolExecutor } from './base'

export class WriteTool implements ToolExecutor {
  definition = {
    name: 'write',
    description:
      'Create a new file or overwrite existing file with content. Requires permission_edit=allow in settings. Path is relative to workspace or absolute when device scope.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path (relative or absolute when device scope)'
        },
        content: {
          type: 'string',
          description: 'Full file content to write'
        }
      },
      required: ['path', 'content']
    }
  }

  async execute(
    args: { path: string; content: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    if (getPermissionEdit() !== 'allow') {
      return { error: 'File writing is disabled. Enable permission_edit in Settings.' }
    }

    const workspaceRoot = getWorkspaceRoot()
    const scope = getFileScope()
    const resolved = resolvePath(workspaceRoot, args.path, scope)
    if (resolved === null) {
      return { error: 'Path is outside workspace or invalid.' }
    }

    try {
      const dir = path.dirname(resolved)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(resolved, args.content, 'utf-8')
      return { content: 'File written.' }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
}
