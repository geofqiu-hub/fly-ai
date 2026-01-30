import { execSync } from 'node:child_process'
import { getWorkspaceRoot, getPermissionBash } from './workspace'
import { ToolExecutor } from './base'

const MAX_OUTPUT_LENGTH = 100 * 1024 // 100KB

export class BashTool implements ToolExecutor {
  definition = {
    name: 'bash',
    description:
      'Execute a shell command in the workspace root. Requires permission_bash=allow in settings. Returns stdout and stderr. Use with care.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to run (e.g. npm install, git status)'
        }
      },
      required: ['command']
    }
  }

  async execute(
    args: { command: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    if (getPermissionBash() !== 'allow') {
      return { error: 'Shell execution is disabled. Enable permission_bash in Settings.' }
    }

    const cwd = getWorkspaceRoot()
    try {
      const out = execSync(args.command, {
        encoding: 'utf-8',
        cwd,
        maxBuffer: MAX_OUTPUT_LENGTH * 2,
        timeout: 60000
      })
      const text = String(out ?? '')
      return { content: text.length > MAX_OUTPUT_LENGTH ? text.slice(0, MAX_OUTPUT_LENGTH) + '\n...(truncated)' : text }
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string }
      const stderr = err.stderr ?? err.message ?? String(e)
      return { error: stderr.slice(0, 2000) }
    }
  }
}
