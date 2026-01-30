import fs from 'node:fs'
import {
  getWorkspaceRoot,
  getFileScope,
  resolvePath,
  MAX_FILE_SIZE_DEVICE
} from './workspace'
import { ToolExecutor } from './base'

export class ReadFileTool implements ToolExecutor {
  definition = {
    name: 'read_file',
    description:
      'Read file contents. When scope is workspace: path is relative to workspace root. When scope is device: path can be absolute (e.g. /Users/name/file.txt) or relative. Use startLine/endLine for large files (1-based inclusive).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'File path: relative to workspace root, or absolute path when device scope is enabled (e.g. /Users/xxx/file.txt or src/index.ts)'
        },
        startLine: {
          type: 'number',
          description: 'Optional 1-based start line (inclusive)'
        },
        endLine: {
          type: 'number',
          description: 'Optional 1-based end line (inclusive)'
        }
      },
      required: ['path']
    }
  }

  async execute(
    args: { path: string; startLine?: number; endLine?: number },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    const workspaceRoot = getWorkspaceRoot()
    const scope = getFileScope()
    const resolved = resolvePath(workspaceRoot, args.path, scope)
    if (resolved === null) {
      return { error: 'Path is outside workspace or invalid.' }
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(resolved)
      if (stat.isDirectory()) {
        return { error: 'Path is not a file.' }
      }
    } catch {
      return { error: 'File not found or not accessible.' }
    }

    if (scope === 'device' && stat.size > MAX_FILE_SIZE_DEVICE) {
      return {
        error: `File too large (${Math.round(stat.size / 1024)}KB). Max ${MAX_FILE_SIZE_DEVICE / 1024 / 1024}MB in device scope.`
      }
    }

    try {
      const raw = fs.readFileSync(resolved, 'utf-8')
      const lines = raw.split(/\r?\n/)

      const start =
        typeof args.startLine === 'number' ? Math.max(1, Math.floor(args.startLine)) : 1
      const end =
        typeof args.endLine === 'number'
          ? Math.min(lines.length, Math.floor(args.endLine))
          : lines.length

      if (start > end) {
        return { content: '' }
      }
      const slice = lines.slice(start - 1, end).join('\n')
      return { content: slice }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
}
