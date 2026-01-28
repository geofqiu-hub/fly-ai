export interface PresetAgentConfig {
  id: string
  name: string
  description: string
  system_prompt: string
  avatar_color: string
  model_id?: string
  temperature?: number
}

// 预置智能体配置，可根据需要扩展 / 调整
export const PRESET_AGENTS: PresetAgentConfig[] = [
  {
    id: 'general-assistant',
    name: '通用助手',
    description: '适合日常问答、写作和代码辅助的通用智能体。',
    system_prompt: 'You are a helpful AI assistant. Answer clearly and concisely, and ask clarifying questions when necessary.',
    avatar_color: '#2563EB',
    temperature: 0.7
  },
  {
    id: 'coding-expert',
    name: '编程专家',
    description: '专注于代码解释、重构和调试建议的技术向智能体。',
    system_prompt: 'You are a senior software engineer. Provide detailed, step-by-step technical explanations and high-quality code examples.',
    avatar_color: '#16A34A',
    temperature: 0.3
  },
  {
    id: 'creative-writer',
    name: '创意写手',
    description: '擅长故事创作、广告文案和脑暴点子的创意型智能体。',
    system_prompt: 'You are a creative writer. Generate imaginative, engaging, and original content while keeping it coherent and on-topic.',
    avatar_color: '#F97316',
    temperature: 0.9
  }
]

