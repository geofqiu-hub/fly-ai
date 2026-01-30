import fs from 'node:fs'
import path from 'node:path'
import { getWorkspaceRoot, getFileScope, resolvePath } from './workspace'
import { ToolExecutor } from './base'

export class ListDirTool implements ToolExecutor {
  definition = {
    name: 'list_dir',
    description:
      'List files and directories in a given path. Path is relative to workspace root, or absolute when device scope is enabled. Optional pattern filters by filename (e.g. *.ts).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path (relative or absolute when device scope)'
        },
        pattern: {
          type: 'string',
          description: 'Optional glob-like filter for names (e.g. *.ts, src*)'
        }
      },
      required: ['path']
    }
  }

  private matchPattern(name: string, pattern: string): boolean {
    if (!pattern || pattern === '*') return true
    const re = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      'i'
    )
    return re.test(name)
  }

  async execute(
    args: { path: string; pattern?: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    const workspaceRoot = getWorkspaceRoot()
    const scope = getFileScope()
    const resolved = resolvePath(workspaceRoot, args.path, scope)
    if (resolved === null) {
      return { error: 'Path is outside workspace or invalid.' }
    }

    try {
      const stat = fs.statSync(resolved)
      if (!stat.isDirectory()) {
        return { error: 'Path is not a directory.' }
      }
    } catch {
      return { error: 'Directory not found or not accessible.' }
    }

    try {
      const names = fs.readdirSync(resolved)
      const pattern = args.pattern?.trim()
      const filtered = pattern ? names.filter(n => this.matchPattern(n, pattern)) : names
      const entries = filtered.map(name => {
        const full = path.join(resolved, name)
        let kind = 'file'
        try {
          if (fs.statSync(full).isDirectory()) kind = 'dir'
        } catch {
          // ignore
        }
        return { name, kind }
      })
      const lines = entries.map(e => `${e.kind}\t${e.name}`)
      return { content: lines.length ? lines.join('\n') : '(empty)' }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
}
