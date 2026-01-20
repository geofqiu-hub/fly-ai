import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { InputArea } from './components/InputArea'
import { SettingsModal } from './components/SettingsModal'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

interface ImageDownloadProgress {
  url: string
  status: 'downloading' | 'completed' | 'error'
  flyaiUrl?: string
  progress?: number
}

const DEFAULT_MODELS = {
    gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
}

const SYSTEM_PROMPT = `You are FlyAi, an intelligent assistant. 
For EVERY response, first write reasoning in <thought> tags, then the answer.
If generating images natively, do so. If not, use: ![Desc](https://image.pollinations.ai/prompt/<prompt>)`

function App() {
  const [messages, setMessages] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [refreshSidebar, setRefreshSidebar] = useState(0)
  const [enabledProviders, setEnabledProviders] = useState({ gemini: true, openai: false })
  const [availableModels, setAvailableModels] = useState<{ gemini: string[], openai: string[] }>(DEFAULT_MODELS)
  const [lastUsedModelId, setLastUsedModelId] = useState<string | undefined>(undefined)
  const imageDownloadsRef = useRef<Map<string, ImageDownloadProgress>>(new Map())
  const [, setImageDownloadTrigger] = useState(0) // Used to force re-render for image progress

  useEffect(() => { initApp() }, [])

  const initApp = async () => {
      await loadSettings()
      const sessions = await window.api.getSessions()
      // Don't auto-load any session, let user start fresh
      console.log('🚀 App initialized -', sessions.length, 'sessions found')
  }

  const loadSettings = async () => {
      const g = await window.api.getSetting('gemini_enabled')
      const o = await window.api.getSetting('openai_enabled')
      const gModels = await window.api.getSetting('gemini_models')
      const oModels = await window.api.getSetting('openai_models')
      const lastModel = await window.api.getSetting('last_model_id')

      setEnabledProviders({ gemini: g === 'true' || g === null, openai: o === 'true' })
      setAvailableModels({
          gemini: gModels ? JSON.parse(gModels) : DEFAULT_MODELS.gemini,
          openai: oModels ? JSON.parse(oModels) : DEFAULT_MODELS.openai
      })
      if (lastModel) setLastUsedModelId(lastModel)
  }

  const createNewSession = async () => {
    const id = await window.api.createSession('New Chat')
    setCurrentSessionId(id)
    setMessages([])
    setRefreshSidebar(prev => prev + 1)
  }

  // Check if there's an empty session and delete it on first interaction
  const checkAndCleanEmptySession = async () => {
      const sessions = await window.api.getSessions()
      if (!sessions || sessions.length <= 1) return

      // Check each session's message count
      const sessionWithMessages: Array<{session: any, msgCount: number}> = []
      for (const session of sessions) {
        const msgs = await window.api.getMessages(session.id)
        sessionWithMessages.push({ session, msgCount: msgs?.length || 0 })
      }

      // Find empty sessions (excluding the one being loaded)
      const emptySession = sessionWithMessages.find(({ msgCount }) => msgCount === 0)

      if (emptySession && sessions.length > 1) {
        // Delete the empty session if there are other sessions
        await window.api.deleteSession(emptySession.session.id)
        setRefreshSidebar(prev => prev + 1)
        console.log('Auto-cleaned empty session:', emptySession.session.id)
      }
  }

  const loadSession = async (id: string) => {
    setCurrentSessionId(id)
    const msgs = await window.api.getMessages(id)
    setMessages(msgs)
    // Check and clean empty sessions when user loads a session
    checkAndCleanEmptySession()
  }

  // Download external image and convert to flyai:// URL
  const downloadExternalImage = async (url: string, sessionId: string | null): Promise<string | null> => {
    if (!sessionId || imageDownloadsRef.current.has(url)) {
      return imageDownloadsRef.current.get(url)?.flyaiUrl || null
    }

    // Mark as downloading
    imageDownloadsRef.current.set(url, { url, status: 'downloading', progress: 0 })
    setImageDownloadTrigger(prev => prev + 1)

    try {
      console.log('🖼️ Downloading external image:', url)

      // Fetch image with progress tracking
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Update progress
        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100)
          imageDownloadsRef.current.set(url, { url, status: 'downloading', progress })
          setImageDownloadTrigger(prev => prev + 1)
        }
      }

      // Combine chunks and convert to base64
      const blob = new Blob(chunks as BlobPart[])
      const buffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

      // Determine MIME type
      const contentType = response.headers.get('content-type') || 'image/png'

      // Save via IPC
      const filename = await window.api.saveImage({
        base64,
        mimeType: contentType,
        sessionId
      })

      const flyaiUrl = `flyai://${filename}`

      // Mark as completed
      imageDownloadsRef.current.set(url, { url, status: 'completed', flyaiUrl, progress: 100 })
      setImageDownloadTrigger(prev => prev + 1)

      console.log('✅ Image downloaded and saved:', flyaiUrl)
      return flyaiUrl
    } catch (error) {
      console.error('❌ Failed to download image:', url, error)
      imageDownloadsRef.current.set(url, { url, status: 'error' })
      setImageDownloadTrigger(prev => prev + 1)
      return null
    }
  }

  const handleDeleteSession = async (deletedId: string) => {
      // Only create new session if we deleted the current session and have no other sessions
      if (currentSessionId === deletedId) {
        const sessions = await window.api.getSessions()
        if (!sessions || sessions.length === 0) {
          await createNewSession()
        }
      }
    }

  const handleSend = async (text: string, attachments: any[] = [], modelId?: string) => {
    console.log('📤 Send message called - currentSessionId:', currentSessionId)

    // If no session exists, create one first and use its ID directly
    let sessionId = currentSessionId
    if (!sessionId) {
      console.log('🆕 No session found, creating new one...')
      sessionId = await window.api.createSession('New Chat')
      console.log('✅ New session created:', sessionId)
      setCurrentSessionId(sessionId)
      setMessages([])
      setRefreshSidebar(prev => prev + 1)
      // Wait a moment for state to settle
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log('💾 Saving message to session:', sessionId)

    const userMsgId = await window.api.saveMessage({ sessionId, role: 'user', content: text, attachments: attachments.length > 0 ? attachments : undefined })
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text, attachments: attachments }])
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const activeModelId = modelId || lastUsedModelId || availableModels.gemini[0] || 'gemini-2.0-flash-exp'

      // Save last used model
      await window.api.saveSetting('last_model_id', activeModelId)
      setLastUsedModelId(activeModelId)

      if (activeModelId.startsWith('gemini')) { await handleGeminiGeneration(text, attachments, activeModelId, sessionId) }
      else if (activeModelId.startsWith('gpt')) { await handleOpenAIGeneration(text, attachments, activeModelId, sessionId) }
      else { await handleGeminiGeneration(text, attachments, activeModelId, sessionId) }

      if (messages.length === 0) {
        const title = text.slice(0, 30) || 'New Chat'
        await window.api.updateSessionTitle({ sessionId, title })
        setRefreshSidebar(prev => prev + 1)
      }
    } catch (error: any) {
      const errorMsg = "Error: " + (error.message || 'Unknown error occurred')
      setStreamingContent(errorMsg)
      await saveBotMessage(errorMsg, sessionId)
    } finally { setIsStreaming(false); setStreamingContent('') }
  }

  const handleGeminiGeneration = async (text: string, attachments: any[], modelId: string, sessionId: string) => {
    const apiKey = await window.api.getSetting('gemini_api_key')
    const baseUrl = await window.api.getSetting('gemini_base_url')
    if (!apiKey) throw new Error("Please set your Gemini API Key in Settings.")
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: SYSTEM_PROMPT }, { baseUrl: baseUrl || undefined })

    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))
    const parts: any[] = []
    if (text) parts.push({ text })
    for (const att of attachments) {
        const base64Data = att.data.split(',')[1]
        if (att.type.startsWith('image/') || att.type === 'application/pdf') { parts.push({ inlineData: { data: base64Data, mimeType: att.type } }) }
        else if (att.type.startsWith('text/') || att.type.includes('json')) {
            try { parts.push({ text: `\n\n[File: ${att.name}]\n\
\
${atob(base64Data)}
\
\
` }) } catch (e) {}
        }
    }

    console.log('🔍 Gemini Request:', { modelId, baseUrl, text: text.slice(0, 100), attachmentsCount: attachments.length })

    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(parts)
    let fullText = ''

    try {
      for await (const chunk of result.stream) {
        console.log('📦 Stream chunk:', JSON.stringify(chunk, null, 2))

        const candidate = chunk.candidates?.[0]
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.text) {
                    fullText += part.text
                    setStreamingContent(fullText)

                    // Detect and download external image URLs in streaming content
                    processExternalImages(fullText, sessionId)
                } else if (part.inlineData) {
                    console.log('🖼️ Image received:', part.inlineData.mimeType)
                    // SAVE IMAGE TO DISK VIA IPC
                    const filename = await window.api.saveImage({
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType,
                        sessionId: sessionId
                    })

                    // Use custom protocol with session path
                    fullText += `\n![${part.inlineData.mimeType}](flyai://${filename})\n`
                    setStreamingContent(fullText)
                }
            }
        }
      }
      console.log('✅ Gemini generation complete, text length:', fullText.length)
    } catch (streamError) {
      console.error('❌ Stream processing error:', streamError)
      console.log('📋 Partial response received:', fullText.slice(0, 500))
      throw streamError
    }

    await saveBotMessage(fullText, sessionId)
  }

  // Process external image URLs in markdown content
  const processExternalImages = async (content: string, sessionId: string) => {
    // Match markdown image syntax with external URLs
    const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
    const matches = [...content.matchAll(imageRegex)]

    for (const match of matches) {
      const alt = match[1]
      const url = match[2]

      // Only process external URLs that are not already being downloaded
      if (!imageDownloadsRef.current.has(url)) {
        // Start download in background
        downloadExternalImage(url, sessionId).then(flyaiUrl => {
          if (flyaiUrl) {
            console.log('🔄 Replaced external URL with flyai://:', url, '->', flyaiUrl)
          }
        })
      }
    }
  }

  const handleOpenAIGeneration = async (text: string, attachments: any[], modelId: string, sessionId: string) => {
    const apiKey = await window.api.getSetting('openai_api_key')
    const baseUrl = await window.api.getSetting('openai_base_url')
    if (!apiKey) throw new Error("Please set your OpenAI API Key in Settings.")
    const openai = new OpenAI({ apiKey, baseURL: baseUrl || undefined, dangerouslyAllowBrowser: true })

    const currentMessages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }))]
    const userContent: any[] = []
    if (text) userContent.push({ type: "text", text })
    for (const att of attachments) {
        if (att.type.startsWith('image/')) { userContent.push({ type: "image_url", image_url: { url: att.data } }) }
        else if (att.type.startsWith('text/')) { userContent.push({ type: "text", text: `\n\n[File: ${att.name}]\n\
\
${atob(att.data.split(',')[1])}
\
\
` }) }
    }
    currentMessages.push({ role: 'user', content: userContent })

    const stream = await openai.chat.completions.create({ model: modelId, messages: currentMessages, stream: true })
    let fullText = ''
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) { fullText += content; setStreamingContent(fullText) }
    }
    await saveBotMessage(fullText, sessionId)
  }

  const saveBotMessage = async (content: string, sessionId: string) => {
      if (!sessionId) return
      const botMsgId = await window.api.saveMessage({ sessionId, role: 'model', content: content })
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', content: content, type: 'text' }])
  }

  return (
    <div className="flex h-screen w-full bg-claude-bg text-gray-800 font-sans selection:bg-claude-accent selection:text-white">
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} onSelectSession={loadSession} currentSessionId={currentSessionId} onNewSession={createNewSession} refreshTrigger={refreshSidebar} onDeleteSession={handleDeleteSession} />
      <div className="flex-1 flex flex-col h-full relative">
        <div className="h-8 w-full shrink-0 drag-region z-50 absolute top-0 left-0" />
          <ChatArea messages={messages} streamingContent={streamingContent} isStreaming={isStreaming} imageDownloads={imageDownloadsRef.current} />
        <InputArea onSend={handleSend} disabled={isStreaming} enabledProviders={enabledProviders} availableModels={availableModels} lastUsedModelId={lastUsedModelId} />
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSettingsChanged={loadSettings} />
    </div>
  )
}

export default App
