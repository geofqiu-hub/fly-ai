import { ToolExecutor } from './base'
import { providerManager } from '../providers/provider-manager'
import { ChatStorage } from '../utils/chat-storage'
import db from '../database'

export class ImageGenTool implements ToolExecutor {
  definition = {
    name: 'generate_image',
    description: 'Generate an image based on a text prompt.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A detailed description of the image to generate.'
        }
      },
      required: ['prompt']
    }
  }

  async execute(args: { prompt: string }, context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }) {
    const { sessionId, apiKey, baseUrl, onEvent } = context
    const targetModelId = 'gemini-3-pro-image-preview'

    console.log(`[ImageGenTool] Generating image with prompt: ${args.prompt} using model: ${targetModelId}`)

    const provider = providerManager.getProvider('gemini')
    if (!provider) {
      throw new Error('Gemini provider not found')
    }

    // Call the specific image generation model
    // We use streamChat but we expect it to produce an image
    const generator = provider.streamChat({
      sessionId,
      config: {
        apiKey,
        baseUrl,
        provider: 'gemini',
        modelId: targetModelId
      },
      messages: [{ role: 'user', content: args.prompt }],
      callbacks: {
        onChunk: () => {},
        onComplete: () => {},
        onError: () => {}
      }
    })

    let lastEvent: any = null
    let generatedContent = ''
    for await (const event of generator) {
      lastEvent = event
      if (onEvent) onEvent(event) // Pass through events to the caller

      if (event.type === 'text-delta' && typeof event.data === 'string') {
        generatedContent += event.data
      }
    }

    if (lastEvent?.type === 'finish') {
      return { success: true, content: generatedContent || lastEvent.data?.content }
    } else if (lastEvent?.type === 'error') {
      throw new Error(lastEvent.data)
    }

    return { success: false, error: 'Failed to generate image' }
  }
}
