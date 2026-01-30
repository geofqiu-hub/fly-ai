import fs from 'node:fs'
import path from 'node:path'
import { getWorkspaceRoot, getFileScope, resolvePath } from './workspace'
import { ToolExecutor } from './base'

const MAX_FILES_TO_SEARCH = 500
const MAX_TOTAL_BYTES = 5 * 1024 * 1024 // 5MB total read

function walkDir(dir: string, out: string[], baseDir: string): void {
  let count = 0
  const queue = [dir]
  while (queue.length > 0 && count < MAX_FILES_TO_SEARCH) {
    const current = queue.shift()!
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const e of entries) {
      if (count >= MAX_FILES_TO_SEARCH) break
      const full = path.join(current, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git' && !e.name.startsWith('.')) {
          queue.push(full)
        }
        continue
      }
      if (e.isFile()) {
        out.push(path.relative(baseDir, full))
        count += 1
      }
    }
  }
}

export class GrepTool implements ToolExecutor {
  definition = {
    name: 'grep',
    description:
      'Search file contents with a regex pattern. Path is directory (relative or absolute when device scope). Optional glob filter for filenames (e.g. *.ts). Returns matching lines with file:line:content.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory to search in (relative or absolute when device scope)'
        },
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for (JavaScript regex)'
        },
        glob: {
          type: 'string',
          description: 'Optional filename filter (e.g. *.ts, *.json)'
        }
      },
      required: ['path', 'pattern']
    }
  }

  private matchGlob(name: string, g: string): boolean {
    const re = new RegExp(
      '^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      'i'
    )
    return re.test(name)
  }

  async execute(
    args: { path: string; pattern: string; glob?: string },
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

    let patternRe: RegExp
    try {
      patternRe = new RegExp(args.pattern)
    } catch {
      return { error: 'Invalid regex pattern.' }
    }

    const files: string[] = []
    walkDir(resolved, files, resolved)
    const glob = args.glob?.trim()
    const toSearch = glob ? files.filter(f => this.matchGlob(path.basename(f), glob)) : files

    const results: string[] = []
    let totalBytes = 0
    for (const rel of toSearch) {
      if (totalBytes >= MAX_TOTAL_BYTES) break
      const full = path.join(resolved, rel)
      try {
        const stat = fs.statSync(full)
        if (!stat.isFile() || stat.size > 512 * 1024) continue
        const content = fs.readFileSync(full, 'utf-8')
        totalBytes += Buffer.byteLength(content, 'utf-8')
        const lines = content.split(/\r?\n/)
        lines.forEach((line, i) => {
          if (patternRe.test(line)) {
            results.push(`${rel}:${i + 1}: ${line.trim()}`)
          }
        })
      } catch {
        // skip binary or unreadable
      }
    }
    return { content: results.length ? results.slice(0, 200).join('\n') : 'No matches.' }
  }
}
