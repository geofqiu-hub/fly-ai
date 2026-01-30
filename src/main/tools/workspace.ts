import path from 'node:path'
import { getSetting } from '../database'

/** Max file size when reading in "device" scope (2MB). */
export const MAX_FILE_SIZE_DEVICE = 2 * 1024 * 1024

export function getWorkspaceRoot(): string {
  const workspacePath = getSetting('workspace_path')
  if (workspacePath && workspacePath.trim().length > 0) {
    return path.resolve(workspacePath.trim())
  }
  return process.cwd()
}

export function getFileScope(): 'workspace' | 'device' {
  const v = getSetting('file_scope')
  return v === 'device' ? 'device' : 'workspace'
}

/** Resolve path relative to workspace; returns null if path escapes workspace. */
export function resolveInWorkspace(workspaceRoot: string, relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/^(\.\/)+/, '')
  const resolved = path.resolve(workspaceRoot, normalized)
  const relative = path.relative(workspaceRoot, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }
  return resolved
}

/** Resolve path when scope is device: absolute as-is, relative under workspace. */
export function resolveForDevice(workspaceRoot: string, rawPath: string): string | null {
  const normalized = path.normalize(rawPath)
  if (path.isAbsolute(normalized)) {
    return normalized
  }
  return resolveInWorkspace(workspaceRoot, normalized)
}

export function resolvePath(workspaceRoot: string, rawPath: string, scope: 'workspace' | 'device'): string | null {
  return scope === 'device' ? resolveForDevice(workspaceRoot, rawPath) : resolveInWorkspace(workspaceRoot, rawPath)
}

/** Permission for edit/write: allow | deny. */
export function getPermissionEdit(): 'allow' | 'deny' {
  const v = getSetting('permission_edit')
  return v === 'allow' ? 'allow' : 'deny'
}

/** Permission for bash: allow | deny. */
export function getPermissionBash(): 'allow' | 'deny' {
  const v = getSetting('permission_bash')
  return v === 'allow' ? 'allow' : 'deny'
}
