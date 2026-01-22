import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'
import { Provider, StreamEvent, ChatParams, MultimodalParams, Model, ProviderConfig } from './base'

export class GeminiProvider implements Provider {
  id = 'gemini'
  name = 'Google Gemini'
  private genAI: GoogleGenerativeAI | null = null

  private initialize(apiKey: string): GoogleGenerativeAI {
    if (!this.genAI || this.genAI.apiKey !== apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
    return this.genAI
  }

  async *streamChat(params: ChatParams): AsyncGenerator<StreamEvent> {
    const { config, callbacks, systemPrompt, temperature, maxTokens } = params

    console.log('[GeminiProvider] streamChat called', { modelId: config.modelId, systemPrompt, temperature, maxTokens, baseUrl: config.baseUrl })

    try {
      this.initialize(config.apiKey)
      const model = this.genAI!.getGenerativeModel({
        model: config.modelId,
        systemInstruction: systemPrompt
      }, config.baseUrl ? { baseUrl: config.baseUrl } : undefined)

      yield { type: 'start', data: { modelId: config.modelId } }

      const geminiHistory = this.convertMessagesToGemini(params.messages)
      console.log('[GeminiProvider] Converted messages:', geminiHistory)

      console.log('[GeminiProvider] Calling generateContentStream...')
      const result = await model.generateContentStream({
        contents: geminiHistory,
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens
        }
      })

      let fullContent = ''

      console.log('[GeminiProvider] Streaming started...')
      for await (const chunk of result.stream) {
        // Handle text parts
        const text = chunk.text()
        if (text) {
          fullContent += text
          params.callbacks.onChunk(text)
          yield { type: 'text-delta', data: text }
        }

        // Handle potential multimodal parts in the chunk
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64 = part.inlineData.data
              const mimeType = part.inlineData.mimeType
              const dataUrl = `data:${mimeType};base64,${base64}`
              
              // We can append this as a markdown image to the content so it renders
              const imgMarkdown = `\n![generated_image](${dataUrl})\n`
              fullContent += imgMarkdown
              params.callbacks.onChunk(imgMarkdown)
              yield { type: 'text-delta', data: imgMarkdown }
            }
          }
        }
      }

      console.log('[GeminiProvider] Streaming complete, total content:', fullContent)
      params.callbacks.onComplete(fullContent)
      yield { type: 'finish', data: { content: fullContent } }
    } catch (error) {
      console.error('[GeminiProvider] Error:', error)
      const err = error as Error
      params.callbacks.onError(err)
      yield { type: 'error', data: err.message }
    }
  }

  async *streamMultimodal(params: MultimodalParams): AsyncGenerator<StreamEvent> {
    const { config, callbacks } = params

    try {
      this.initialize(config.apiKey)
      const model = this.genAI!.getGenerativeModel(
        { model: config.modelId },
        config.baseUrl ? { baseUrl: config.baseUrl } : undefined
      )

      yield { type: 'start', data: { modelId: config.modelId } }

      const parts = this.convertToGeminiParts(params.messages)

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts }]
      })

      let fullContent = ''

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullContent += text
          callbacks.onChunk(text)
          yield { type: 'text-delta', data: text }
        }
      }

      callbacks.onComplete(fullContent)
      yield { type: 'finish', data: { content: fullContent } }
    } catch (error) {
      const err = error as Error
      callbacks.onError(err)
      yield { type: 'error', data: err.message }
    }
  }

  async getModels(apiKey?: string): Promise<Model[]> {
    const db = await import('../database').then(m => m.default)
    const stmt = db.prepare('SELECT * FROM models WHERE provider = ? AND is_enabled = 1')
    const rows = stmt.all('gemini') as any[]
    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      modelId: row.model_id,
      name: row.name,
      capabilities: JSON.parse(row.capabilities),
      contextWindow: row.context_window,
      inputCost: row.input_cost,
      outputCost: row.output_cost,
      isEnabled: row.is_enabled === 1
    }))
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
  
  async generateTitle(params: { config: ProviderConfig; message: string }): Promise<string> {
    const { config, message } = params
    try {
      this.initialize(config.apiKey)
      const model = this.genAI!.getGenerativeModel({
        model: config.modelId,
        systemInstruction: "You are a helpful assistant. Your task is to generate a concise, meaningful title (max 6 words) for a chat session based on the user's first message. Provide only the title text, no quotes or extra characters."
      }, config.baseUrl ? { baseUrl: config.baseUrl } : undefined)

      const result = await model.generateContent(message)
      const response = await result.response
      const text = response.text().trim()
      // Remove quotes if the model added them
      return text.replace(/^["'](.*)["']$/, '$1')
    } catch (error) {
      console.error('[GeminiProvider] generateTitle error:', error)
      return 'New Chat'
    }
  }

  private convertMessagesToGemini(messages: any[]): Array<{ role: string; parts: Part[] }> {
    return messages.map(msg => {
      const parts: Part[] = []
      
      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content })
      }

      // Add attachments if they exist
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) => {
          if (att.data) {
            const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.type || 'application/octet-stream'
              }
            })
          }
        })
      }

      // Add parts if they exist (from database structure)
      if (msg.parts && Array.isArray(msg.parts)) {
        msg.parts.forEach((part: any) => {
          if (part.type === 'text' && part.content) {
            parts.push({ text: part.content })
          } else if (part.content) {
            const base64Data = part.content.includes(',') ? part.content.split(',')[1] : part.content
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: part.mimeType || (part.type === 'image' ? 'image/jpeg' : 'application/octet-stream')
              }
            })
          }
        })
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: '' }]
      }
    })
  }

  private convertToGeminiParts(messages: any[]): Part[] {
    const parts: Part[] = []

    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          switch (part.type) {
            case 'text':
              parts.push({ text: part.content || '' })
              break
            default:
              if (part.content) {
                parts.push({
                  inlineData: {
                    data: part.content.includes(',') ? part.content.split(',')[1] : part.content,
                    mimeType: part.mimeType || (part.type === 'image' ? 'image/jpeg' : 'application/octet-stream')
                  }
                })
              }
              break
          }
        }
      } else {
        parts.push({ text: message.content || '' })
      }
    }

    return parts
  }
}

export default GeminiProvider
