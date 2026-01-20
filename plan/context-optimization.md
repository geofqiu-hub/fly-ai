# FlyAi 对话上下文优化方案

> **版本**: v1.0
> **创建日期**: 2026-01-20
> **目标**: 优化长对话场景下的上下文管理，提升性能并降低 API 成本

---

## 📋 目录

1. [现状分析](#现状分析)
2. [核心问题](#核心问题)
3. [优化方案](#优化方案)
4. [实施计划](#实施计划)
5. [预期效果](#预期效果)
6. [风险与缓解](#风险与缓解)

---

## 🔍 现状分析

### 当前实现（App.tsx）

```typescript
// Gemini API - 第 235 行
const history = messages.map(m => ({
  role: m.role === 'user' ? 'user' : 'model',
  parts: [{ text: m.content }]
}))

// OpenAI API - 第 324 行
const currentMessages = [
  { role: 'system', content: SYSTEM_PROMPT },
  ...messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.content
  }))
]
```

### 问题规模评估

| 对话轮数 | 消息数量 | 估算 Token | API 延迟 | 每轮成本 |
|---------|---------|-----------|---------|---------|
| 10 轮 | 20 条 | ~3K | 正常 | 1x |
| 50 轮 | 100 条 | ~15K | 明显增加 | 5x |
| 100 轮 | 200 条 | ~30K | 显著延迟 | 10x |
| 500 轮 | 1000 条 | ~150K | 严重超时 | 50x ❌ |

---

## ⚠️ 核心问题

### 1. 无上下文窗口限制
- **问题**: 每次请求发送完整历史记录
- **影响**: 线性性能下降，长对话不可用

### 2. 缺少 Token 管理
- **问题**: 无 Token 计数，无超限保护
- **影响**: 可能触发 API 错误（如 Gemini 1M token 限制）

### 3. 无上下文压缩
- **问题**: 早期消息重复传输，无摘要机制
- **影响**: 浪费带宽，增加延迟

### 4. 成本失控
- **问题**: 历史消息重复计费
- **影响**: 使用成本随对话长度线性增长

---

## 🎯 优化方案

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Context Manager                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Token Counter│  │ Window Mgmt  │  │  Summarizer  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Optimized Context Window                   │
│  ┌──────────┐  ┌──────────────────────────────────┐    │
│  │ System   │  │    Recent Messages (Sliding)     │    │
│  │ Prompt   │  │    [msg-N] ... [msg-1]          │    │
│  └──────────┘  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Compressed Summary (Optional)                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 实施细节

### Phase 1: 基础上下文窗口管理

#### 1.1 创建 Context Manager 模块

**文件**: `src/renderer/src/utils/contextManager.ts`

```typescript
export interface ContextWindowConfig {
  maxMessages?: number;          // 最大消息数量
  maxTokens?: number;            // 最大 token 数量
  preserveSystemPrompt?: boolean; // 是否保留系统提示
  enableSlidingWindow?: boolean;  // 启用滑动窗口
  slidingWindowSize?: number;     // 滑动窗口大小（保留最近 N 条）
}

export interface ContextStats {
  totalMessages: number;
  includedMessages: number;
  estimatedTokens: number;
  compressionRatio: number;
}

/**
 * 上下文窗口管理器
 */
export class ContextManager {
  private config: Required<ContextWindowConfig>;
  private tokenizer: TokenCounter;

  constructor(config: ContextWindowConfig = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? 100,
      maxTokens: config.maxTokens ?? 100000,
      preserveSystemPrompt: config.preserveSystemPrompt ?? true,
      enableSlidingWindow: config.enableSlidingWindow ?? true,
      slidingWindowSize: config.slidingWindowSize ?? 50
    };
    this.tokenizer = new TokenCounter();
  }

  /**
   * 构建优化的上下文窗口
   */
  buildContext(messages: Message[], systemPrompt?: string): {
    messages: Message[];
    stats: ContextStats;
  } {
    let processedMessages = [...messages];
    let compressedSummary: string | null = null;

    // 1. 分离系统消息（如果有）
    const systemMsg = processedMessages.find(m => m.role === 'system');
    if (systemMsg) {
      processedMessages = processedMessages.filter(m => m.role !== 'system');
    }

    // 2. 启用滑动窗口时，检查是否需要压缩
    if (this.config.enableSlidingWindow && processedMessages.length > this.config.maxMessages) {
      // 超出部分进行摘要
      const overflowMessages = processedMessages.slice(0, -this.config.slidingWindowSize);
      const recentMessages = processedMessages.slice(-this.config.slidingWindowSize);

      // 生成摘要（可选，Phase 2 实现）
      if (overflowMessages.length > 0) {
        compressedSummary = this.generateBasicSummary(overflowMessages);
        processedMessages = recentMessages;
      }
    }

    // 3. Token 限制检查
    const tokenCount = this.tokenizer.countMessages(processedMessages);
    if (tokenCount > this.config.maxTokens) {
      // 进一步裁剪以满足 token 限制
      processedMessages = this.trimByTokens(processedMessages, this.config.maxTokens);
    }

    // 4. 重组最终上下文
    const finalMessages: Message[] = [];

    // 添加系统提示
    if (systemPrompt || systemMsg) {
      finalMessages.push({
        id: 'system',
        role: 'system',
        content: systemPrompt || systemMsg?.content || '',
        type: 'text'
      });
    }

    // 添加压缩摘要（如果有）
    if (compressedSummary) {
      finalMessages.push({
        id: 'summary',
        role: 'system',
        content: `[Previous Conversation Summary]\n${compressedSummary}`,
        type: 'text'
      });
    }

    // 添加处理后的消息
    finalMessages.push(...processedMessages);

    // 5. 计算统计信息
    const stats: ContextStats = {
      totalMessages: messages.length,
      includedMessages: finalMessages.length,
      estimatedTokens: this.tokenizer.countMessages(finalMessages),
      compressionRatio: messages.length > 0
        ? finalMessages.length / messages.length
        : 1
    };

    return { messages: finalMessages, stats };
  }

  /**
   * 基础摘要生成（Phase 1：简单提取）
   */
  private generateBasicSummary(messages: Message[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const keyTopics = this.extractKeyTopics(userMessages);
    const lastMessage = messages[messages.length - 1];

    return `Discussion covered ${messages.length / 2} exchanges about: ${keyTopics.join(', ')}.
Last user message was about: "${lastMessage.content.slice(0, 100)}..."`;
  }

  /**
   * 提取关键主题（简化版）
   */
  private extractKeyTopics(messages: Message[]): string[] {
    // Phase 1: 简单关键词提取
    // Phase 2: 可升级为 AI 语义分析
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    const commonWords = ['the', 'is', 'and', 'to', 'of', 'in', 'for', 'with', 'on'];

    const words = allText.match(/\b[a-z]{4,}\b/g) || [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      if (!commonWords.includes(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * 按 Token 数量裁剪
   */
  private trimByTokens(messages: Message[], maxTokens: number): Message[] {
    const result: Message[] = [];
    let currentTokens = 0;

    // 从最新消息开始倒序添加
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.tokenizer.countMessage(messages[i]);
      if (currentTokens + msgTokens <= maxTokens) {
        result.unshift(messages[i]);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }
}

/**
 * 简易 Token 计数器
 */
class TokenCounter {
  // 粗略估算：英文约 4 字符/token，中文约 2 字符/token
  countMessage(message: Message): number {
    const text = message.content || '';
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  countMessages(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.countMessage(msg), 0);
  }
}
```

#### 1.2 修改 App.tsx 集成 Context Manager

```typescript
import { ContextManager, ContextWindowConfig } from './utils/contextManager';

function App() {
  // ... 现有代码 ...

  // 在合适的位置初始化 Context Manager
  const contextManager = useMemo(() => {
    const config: ContextWindowConfig = {
      maxMessages: 100,           // 最多保留 100 条消息
      maxTokens: 80000,           // 限制 80K tokens（留余量）
      preserveSystemPrompt: true, // 保留系统提示
      enableSlidingWindow: true,  // 启用滑动窗口
      slidingWindowSize: 50       // 保留最近 50 条消息
    };

    return new ContextManager(config);
  }, []);

  // 在发送消息前构建优化的上下文
  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    // ... 现有的消息添加逻辑 ...

    // 构建优化后的上下文
    const { messages: optimizedMessages, stats } = contextManager.buildContext(
      messages,
      SYSTEM_PROMPT
    );

    // 打印统计信息（开发调试）
    console.log('[Context Stats]', {
      original: messages.length,
      optimized: optimizedMessages.length,
      tokens: stats.estimatedTokens,
      compression: stats.compressionRatio.toFixed(2)
    });

    // 使用优化后的消息调用 API
    if (model.startsWith('gemini')) {
      const history = optimizedMessages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      // ... 调用 Gemini API ...
    } else {
      const currentMessages = optimizedMessages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content
      }));

      // ... 调用 OpenAI API ...
    }
  };
}
```

---

### Phase 2: 智能摘要与语义压缩

#### 2.1 AI 驱动的摘要生成

**文件**: `src/renderer/src/utils/summarizer.ts`

```typescript
/**
 * 对话摘要器
 * 使用 AI 模型生成长对话的语义摘要
 */
export class ConversationSummarizer {
  private apiConfig: any;

  constructor(apiConfig: any) {
    this.apiConfig = apiConfig;
  }

  /**
   * 生成对话摘要
   */
  async summarize(messages: Message[]): Promise<string> {
    // 提取关键信息
    const conversationText = this.formatForSummary(messages);
    const summaryPrompt = this.buildSummaryPrompt(conversationText);

    // 调用 AI 模型生成摘要
    // 这里使用快速的模型（如 Gemini 1.5 Flash）
    const summary = await this.callAIForSummary(summaryPrompt);

    return summary;
  }

  /**
   * 格式化消息用于摘要
   */
  private formatForSummary(messages: Message[]): string {
    return messages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${m.content.slice(0, 500)}`; // 截断过长内容
    }).join('\n\n');
  }

  /**
   * 构建摘要提示词
   */
  private buildSummaryPrompt(conversationText: string): string {
    return `Analyze the following conversation and create a concise summary that captures:
1. Main topics discussed
2. Key decisions made
3. Important context for continuation
4. Current state of the conversation

Keep it under 200 words. Use bullet points where appropriate.

Conversation:
${conversationText}

Summary:`;
  }

  /**
   * 调用 AI 生成摘要
   */
  private async callAIForSummary(prompt: string): Promise<string> {
    // 实现细节：调用低成本的快速模型
    // 可以复用现有的 API 调用逻辑
    return ''; // 返回生成的摘要
  }
}
```

#### 2.2 关键信息提取

```typescript
/**
 * 上下文中的关键信息提取器
 */
export class KeyInformationExtractor {
  /**
   * 提取需要保留的关键信息
   */
  extractKeyInfo(messages: Message[]): {
    codeBlocks: string[];
    importantDecisions: string[];
    userPreferences: string[];
    namedEntities: string[];
  } {
    const codeBlocks: string[] = [];
    const importantDecisions: string[] = [];
    const userPreferences: string[] = [];
    const namedEntities: string[] = [];

    messages.forEach(msg => {
      const content = msg.content;

      // 提取代码块
      const codeMatches = content.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        codeBlocks.push(...codeMatches);
      }

      // 提取重要决策（包含 "决定"、"选择"、"配置" 等关键词）
      const decisionKeywords = ['决定', '选择', '配置', '设置', 'decided', 'chose', 'config'];
      if (decisionKeywords.some(kw => content.toLowerCase().includes(kw))) {
        importantDecisions.push(content.slice(0, 200));
      }

      // 提取用户偏好（包含 "我希望"、"想要" 等）
      if (msg.role === 'user') {
        const prefKeywords = ['我希望', '想要', '偏好', 'I want', 'prefer'];
        if (prefKeywords.some(kw => content.includes(kw))) {
          userPreferences.push(content.slice(0, 200));
        }
      }

      // 提取命名实体（文件名、URL、技术术语等）
      const entityPatterns = [
        /[\w-]+\.[a-z]{2,4}/gi,  // 文件名
        /https?:\/\/[^\s]+/gi,    // URL
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g // 专有名词
      ];

      entityPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          namedEntities.push(...matches);
        }
      });
    });

    return {
      codeBlocks: [...new Set(codeBlocks)], // 去重
      importantDecisions: [...new Set(importantDecisions)],
      userPreferences: [...new Set(userPreferences)],
      namedEntities: [...new Set(namedEntities)]
    };
  }
}
```

---

### Phase 3: 高级功能

#### 3.1 自适应上下文窗口

```typescript
/**
 * 根据对话复杂度动态调整上下文大小
 */
export class AdaptiveContextManager extends ContextManager {
  analyzeComplexity(messages: Message[]): {
    complexity: 'low' | 'medium' | 'high';
    suggestedWindowSize: number;
  } {
    // 计算复杂度指标
    const avgMessageLength = messages.reduce((sum, m) =>
      sum + m.content.length, 0) / messages.length;

    const codeBlockCount = messages.reduce((sum, m) =>
      sum + (m.content.match(/```/g) || []).length / 2, 0);

    const topicShifts = this.detectTopicShifts(messages);

    // 决定复杂度
    let complexity: 'low' | 'medium' | 'high';
    if (avgMessageLength < 200 && codeBlockCount < 3 && topicShifts < 2) {
      complexity = 'low';
    } else if (avgMessageLength < 500 && codeBlockCount < 10 && topicShifts < 5) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }

    // 根据复杂度建议窗口大小
    const windowSize = {
      low: 30,
      medium: 50,
      high: 80
    }[complexity];

    return { complexity, suggestedWindowSize: windowSize };
  }

  private detectTopicShifts(messages: Message[]): number {
    // 简化的主题转移检测
    // 实际实现可以使用语义相似度计算
    return 0;
  }
}
```

#### 3.2 分级缓存策略

```typescript
/**
 * 上下文缓存管理
 */
export class ContextCache {
  private cache = new Map<string, {
    messages: Message[];
    timestamp: number;
    hitCount: number;
  }>();

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * 获取缓存的上下文
   */
  get(sessionId: string): Message[] | null {
    const cached = this.cache.get(sessionId);
    if (!cached) return null;

    // 检查过期
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(sessionId);
      return null;
    }

    cached.hitCount++;
    return cached.messages;
  }

  /**
   * 缓存上下文
   */
  set(sessionId: string, messages: Message[]): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // LRU 淘汰
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(sessionId, {
      messages,
      timestamp: Date.now(),
      hitCount: 0
    });
  }

  /**
   * 清除会话缓存
   */
  invalidate(sessionId: string): void {
    this.cache.delete(sessionId);
  }
}
```

#### 3.3 用户配置界面

**文件**: `src/renderer/src/components/ContextSettings.tsx`

```typescript
export function ContextSettings() {
  const [config, setConfig] = useState<ContextWindowConfig>({
    maxMessages: 100,
    maxTokens: 80000,
    enableSlidingWindow: true,
    slidingWindowSize: 50
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">上下文设置</h3>

      <div>
        <label>最大消息数</label>
        <input
          type="number"
          value={config.maxMessages}
          onChange={(e) => setConfig({ ...config, maxMessages: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500">
          建议值: 50-200。数值越大上下文越完整，但 API 调用越慢。
        </p>
      </div>

      <div>
        <label>最大 Token 数</label>
        <input
          type="number"
          value={config.maxTokens}
          onChange={(e) => setConfig({ ...config, maxTokens: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500">
          根据模型限制设置。Gemini 2.0: 1M, GPT-4: 128K
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="slidingWindow"
          checked={config.enableSlidingWindow}
          onChange={(e) => setConfig({ ...config, enableSlidingWindow: e.target.checked })}
        />
        <label htmlFor="slidingWindow">启用滑动窗口</label>
      </div>

      {config.enableSlidingWindow && (
        <div>
          <label>窗口大小（保留最近消息数）</label>
          <input
            type="number"
            value={config.slidingWindowSize}
            onChange={(e) => setConfig({ ...config, slidingWindowSize: Number(e.target.value) })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      )}

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-2">当前使用统计</h4>
        <ContextStatsDisplay />
      </div>
    </div>
  );
}

function ContextStatsDisplay() {
  // 显示当前会话的上下文统计
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>总消息数:</span>
        <span className="font-mono">156</span>
      </div>
      <div className="flex justify-between">
        <span>上下文消息数:</span>
        <span className="font-mono">52</span>
      </div>
      <div className="flex justify-between">
        <span>估算 Token:</span>
        <span className="font-mono">~24,500</span>
      </div>
      <div className="flex justify-between">
        <span>压缩率:</span>
        <span className="font-mono text-green-600">67%</span>
      </div>
    </div>
  );
}
```

---

## 📅 实施计划

### Phase 1: 基础优化（1-2 天）
- [ ] 创建 `ContextManager` 类
- [ ] 实现 Token 计数器
- [ ] 实现滑动窗口逻辑
- [ ] 修改 `App.tsx` 集成上下文管理
- [ ] 添加开发日志输出
- [ ] 基础测试（短对话、长对话）

### Phase 2: 智能压缩（3-5 天）
- [ ] 实现 `ConversationSummarizer`
- [ ] 实现关键信息提取器
- [ ] 添加摘要触发逻辑
- [ ] 优化摘要质量
- [ ] 性能测试与优化

### Phase 3: 高级功能（可选，5-7 天）
- [ ] 实现自适应上下文管理
- [ ] 添加上下文缓存
- [ ] 创建用户配置界面
- [ ] 添加上下文统计可视化
- [ ] 完整集成测试

---

## 📈 预期效果

### 性能改进

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 100 轮对话延迟 | ~15s | ~3s | **80% ↓** |
| Token 使用量 | 30K/轮 | 8K/轮 | **73% ↓** |
| 长对话可用性 | ❌ 不可用 | ✅ 可用 | **无限** |
| API 成本 | 1x | 0.27x | **73% ↓** |

### 用户体验提升

✅ **短响应时间**: 长对话仍然保持快速响应
✅ **成本可控**: API 费用不再随对话长度线性增长
✅ **无限对话**: 理论上支持任意长度的对话
✅ **智能压缩**: 自动保留关键信息，丢弃冗余内容

---

## ⚠️ 风险与缓解

### 风险 1: 上下文信息丢失
**风险**: 滑动窗口可能丢弃重要早期信息
**缓解**:
- 实现智能摘要，保留关键信息
- 提取并保留代码块、决策等关键内容
- 允许用户手动调整窗口大小

### 风险 2: 摘要质量不稳定
**风险**: AI 生成的摘要可能不完整或不准确
**缓解**:
- 使用高质量的摘要提示词
- 提供摘要预览和编辑功能
- 保留原始消息在本地（仅发送摘要到 API）

### 风险 3: 增加实现复杂度
**风险**: 上下文管理增加代码复杂度
**缓解**:
- 模块化设计，职责分离
- 充分的单元测试
- 清晰的代码注释和文档

### 风险 4: Token 计数不精确
**风险**: 估算的 Token 数与实际不符
**缓解**:
- 使用保守的估算（偏高估算）
- 在日志中显示实际 API 返回的 token 数
- 提供 Token 计数校准功能

---

## 🚀 后续优化方向

1. **多模态上下文优化**: 针对图片、文件等附件的特殊处理
2. **增量摘要**: 只对新消息进行增量摘要，减少 AI 调用
3. **上下文重要性评分**: 使用 ML 模型评估每条消息的重要性
4. **用户意图检测**: 根据用户意图动态调整上下文策略
5. **跨会话上下文**: 支持引用其他会话的内容
6. **云端同步**: 将摘要和关键信息同步到云端

---

## 📚 参考资料

- [Gemini API Context Management](https://ai.google.dev/gemini-api/docs/context-management)
- [OpenAI Token Counting](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb)
- [Anthropic Context Window Best Practices](https://docs.anthropic.com/claude/docs/context-window-management)

---

**文档维护**: 本方案应随着项目进展持续更新
**反馈渠道**: 请在实施过程中记录问题和改进建议
