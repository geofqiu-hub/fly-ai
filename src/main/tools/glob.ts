import fs from 'node:fs'
import path from 'node:path'
import { getWorkspaceRoot, getFileScope, resolvePath } from './workspace'
import { ToolExecutor } from './base'

const MAX_FILES = 1000

/** Convert simple glob pattern to regex for path matching. */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<STARSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<STARSTAR>>/g, '.*')
  return new RegExp('^' + escaped + '$', 'i')
}

function walkDir(dir: string, baseDir: string, patternRe: RegExp, out: string[]): void {
  if (out.length >= MAX_FILES) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (out.length >= MAX_FILES) break
    const full = path.join(dir, e.name)
    const rel = path.relative(baseDir, full)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git') {
        walkDir(full, baseDir, patternRe, out)
      }
      continue
    }
    if (e.isFile() && patternRe.test(rel)) {
      out.push(rel)
    }
  }
}

export class GlobTool implements ToolExecutor {
  definition = {
    name: 'glob',
    description:
      'Find files by glob pattern under a directory. Path is relative to workspace or absolute when device scope. Pattern examples: *.ts, **/*.ts, src/**/*.js.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory to search in (relative or absolute when device scope)'
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g. *.ts, **/*.json)'
        }
      },
      required: ['path', 'pattern']
    }
  }

  async execute(
    args: { path: string; pattern: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    const workspaceRoot = getWorkspaceRoot()
    const scope = getFileScope()
    const resolved = resolvePath(workspaceRoot, args.path, scope)
    if (resolved === null) {
      return { error: 'Path is outside workspace or invalid.' }
    }

    try {
      if (!fs.statSync(resolved).isDirectory()) {
        return { error: 'Path is not a directory.' }
      }
    } catch {
      return { error: 'Directory not found or not accessible.' }
    }

    const patternRe = globToRegex(args.pattern)
    const files: string[] = []
    walkDir(resolved, resolved, patternRe, files)
    return { content: files.length ? files.join('\n') : 'No files matched.' }
  }
}
