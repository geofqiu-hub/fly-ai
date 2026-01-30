import fs from 'node:fs'
import { getWorkspaceRoot, getFileScope, resolvePath, getPermissionEdit } from './workspace'
import { ToolExecutor } from './base'

export class EditTool implements ToolExecutor {
  definition = {
    name: 'edit',
    description:
      'Modify a file by replacing exact old_string with new_string (first occurrence). Requires permission_edit=allow in settings. Path is relative to workspace or absolute when device scope.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path (relative or absolute when device scope)'
        },
        old_string: {
          type: 'string',
          description: 'Exact text to find and replace (first occurrence)'
        },
        new_string: {
          type: 'string',
          description: 'Replacement text'
        }
      },
      required: ['path', 'old_string', 'new_string']
    }
  }

  async execute(
    args: { path: string; old_string: string; new_string: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    if (getPermissionEdit() !== 'allow') {
      return { error: 'File editing is disabled. Enable permission_edit in Settings.' }
    }

    const workspaceRoot = getWorkspaceRoot()
    const scope = getFileScope()
    const resolved = resolvePath(workspaceRoot, args.path, scope)
    if (resolved === null) {
      return { error: 'Path is outside workspace or invalid.' }
    }

    try {
      const stat = fs.statSync(resolved)
      if (stat.isDirectory()) {
        return { error: 'Path is not a file.' }
      }
    } catch {
      return { error: 'File not found or not accessible.' }
    }

    try {
      const raw = fs.readFileSync(resolved, 'utf-8')
      const idx = raw.indexOf(args.old_string)
      if (idx === -1) {
        return { error: 'old_string not found in file.' }
      }
      const newContent = raw.slice(0, idx) + args.new_string + raw.slice(idx + args.old_string.length)
      fs.writeFileSync(resolved, newContent, 'utf-8')
      return { content: 'File updated.' }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
}
