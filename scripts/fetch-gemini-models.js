// Simple script to fetch all available Gemini models
// and generate both a JSON file and a Markdown documentation table.
//
// Usage:
//   GEMINI_API_KEY=your_key node scripts/fetch-gemini-models.js
//
// The script will create/overwrite:
//   - docs/gemini-models.md
//   - docs/gemini-models-api.json (raw API response, for reference; app config is src/main/config/gemini-models.json)

import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'

  if (!apiKey) {
    console.error('GEMINI_API_KEY is required. Example:')
    console.error('  GEMINI_API_KEY=xxx node scripts/fetch-gemini-models.js')
    process.exit(1)
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/v1/models?key=${encodeURIComponent(apiKey)}`
  console.log('[fetch-gemini-models] Fetching models from:', url)

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[fetch-gemini-models] Failed to fetch models:', res.status, res.statusText, text)
    process.exit(1)
  }

  const data = await res.json()
  const models = Array.isArray(data.models) ? data.models : []

  // Normalize minimal fields we care about
  const normalized = models.map((m) => ({
    name: m.name || '',
    displayName: m.displayName || '',
    description: m.description || '',
    inputTokenLimit: m.inputTokenLimit,
    outputTokenLimit: m.outputTokenLimit,
    supportedGenerationMethods: m.supportedGenerationMethods || [],
    temperature: m.temperature,
    topP: m.topP,
    topK: m.topK,
    // provider-specific extra fields are kept in case we want them later
    raw: m,
  }))

  // Write JSON for reference (app config is manually maintained at src/main/config/gemini-models.json)
  const jsonOutPath = path.resolve(__dirname, '../docs/gemini-models-api.json')
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true })
  fs.writeFileSync(jsonOutPath, JSON.stringify(normalized, null, 2), 'utf8')
  console.log('[fetch-gemini-models] Wrote JSON:', jsonOutPath)

  // Generate Markdown documentation
  const mdOutPath = path.resolve(__dirname, '../docs/gemini-models.md')
  fs.mkdirSync(path.dirname(mdOutPath), { recursive: true })

  const header = [
    '# Gemini 模型一览',
    '',
    '> 本文档由 `scripts/fetch-gemini-models.js` 自动生成。',
    '> 重新获取最新模型时，请重新运行脚本。',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '| 内部名称 (name) | 显示名称 (displayName) | 说明 (description) | 支持能力 (supportedGenerationMethods) | 输入 Token 上限 | 输出 Token 上限 |',
    '| --- | --- | --- | --- | --- | --- |',
  ].join('\n')

  const rows = normalized
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => {
      const methods = (m.supportedGenerationMethods || []).join(', ')
      const desc =
        (m.description || '').replace(/\r?\n|\|/g, ' ').slice(0, 200) +
        (m.description && m.description.length > 200 ? '…' : '')
      return `| \`${m.name}\` | ${m.displayName || ''} | ${desc} | ${methods} | ${m.inputTokenLimit ?? ''} | ${
        m.outputTokenLimit ?? ''
      } |`
    })

  const md = `${header}\n${rows.join('\n')}\n`
  fs.writeFileSync(mdOutPath, md, 'utf8')
  console.log('[fetch-gemini-models] Wrote Markdown:', mdOutPath)

  console.log('[fetch-gemini-models] Done.')
}

main().catch((err) => {
  console.error('[fetch-gemini-models] Unexpected error:', err)
  process.exit(1)
})

