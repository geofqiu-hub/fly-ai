import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Image as ImageIcon, User, Bot, BrainCircuit, ChevronDown, FileText, FileCode, File, Loader2, Download } from 'lucide-react'
import clsx from 'clsx'

interface Attachment { name: string; type: string; data: string; size: number }
interface Message { id: string; role: 'user' | 'model'; content: string; type: 'text' | 'image'; thought?: string; attachments?: Attachment[] | string }
interface ImageDownloadProgress { url: string; status: 'downloading' | 'completed' | 'error'; flyaiUrl?: string; progress?: number }
interface Props { messages: Message[]; streamingContent: string; isStreaming: boolean; imageDownloads?: Map<string, ImageDownloadProgress> }

const ImageWithLoading = React.memo(({ src, alt, imageDownloads }: { src?: string; alt?: string; imageDownloads?: Map<string, ImageDownloadProgress> }) => {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [actualSrc, setActualSrc] = useState<string | undefined>(undefined)
    const prevSrcRef = useRef<string | undefined>(undefined)

    // Check if this is an external URL being downloaded
    const downloadProgress = src && imageDownloads ? imageDownloads.get(src) : undefined
    const isDownloading = downloadProgress?.status === 'downloading'
    const hasDownloadError = downloadProgress?.status === 'error'
    const isCompleted = downloadProgress?.status === 'completed'
    const flyaiUrl = downloadProgress?.flyaiUrl

    // Use flyai:// URL if download completed, otherwise use original src
    const effectiveSrc = isCompleted && flyaiUrl ? flyaiUrl : src

    // Convert flyai://sessionId/filename to actual data URL
    useEffect(() => {
        const loadFlyaiImage = async () => {
            if (!effectiveSrc) return

            if (effectiveSrc.startsWith('flyai://')) {
                // Extract sessionId and filename from flyai:// URL
                const path = effectiveSrc.replace('flyai://', '')
                const [sessionId, filename] = path.split('/')
                if (!sessionId || !filename) {
                    setHasError(true)
                    setIsLoading(false)
                    return
                }

                setIsLoading(true)
                setHasError(false)
                try {
                    const dataUrl = await window.api.getImage(sessionId, filename)
                    if (dataUrl) {
                        setActualSrc(dataUrl)
                        setIsLoading(false)
                    } else {
                        setHasError(true)
                        setIsLoading(false)
                    }
                } catch (e) {
                    console.error('Failed to load image:', e)
                    setHasError(true)
                    setIsLoading(false)
                }
            } else if (!effectiveSrc.startsWith('http')) {
                // Not a flyai:// URL and not an http URL - load directly
                setActualSrc(effectiveSrc)
                setIsLoading(false)
            } else {
                // External URL - will be handled by download progress check below
                setIsLoading(false)
            }
        }

        if (prevSrcRef.current !== effectiveSrc) {
            prevSrcRef.current = effectiveSrc
            loadFlyaiImage()
        }
    }, [effectiveSrc])

    // Show download progress for external images
    if (isDownloading) {
        return (
            <div className="relative my-2 inline-block">
                <div className="p-4 flex flex-col items-center justify-center text-gray-400 gap-2 bg-white rounded-lg border border-black/5" style={{ minWidth: '150px', width: '200px' }}>
                    <Loader2 size={20} className="animate-spin text-claude-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        {downloadProgress?.progress ? `${downloadProgress.progress}%` : 'Downloading...'}
                    </span>
                </div>
            </div>
        )
    }

    // Show download error
    if (hasDownloadError) {
        return (
            <div className="relative my-2 inline-block">
                <div className="flex flex-col items-center text-gray-400 p-4 text-center bg-white rounded-lg border border-black/5" style={{ minWidth: '150px', width: '200px' }}>
                    <ImageIcon size={24} className="mb-1 opacity-50" />
                    <span className="text-[10px]">Download failed</span>
                </div>
            </div>
        )
    }

    // Show loading state for flyai:// images
    if (isLoading && effectiveSrc?.startsWith('flyai://')) {
        return (
            <div className="relative my-2 inline-block">
                <div className="p-4 flex flex-col items-center justify-center text-gray-400 gap-2 bg-white rounded-lg border border-black/5" style={{ minWidth: '150px', width: '200px' }}>
                    <Loader2 size={20} className="animate-spin text-claude-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Loading...</span>
                </div>
            </div>
        )
    }

    // Show error state
    if (hasError) {
        return (
            <div className="relative my-2 inline-block">
                <div className="flex flex-col items-center text-gray-400 p-4 text-center bg-white rounded-lg border border-black/5" style={{ minWidth: '150px', width: '200px' }}>
                    <ImageIcon size={24} className="mb-1 opacity-50" />
                    <span className="text-[10px]">Image unavailable</span>
                    <button
                        onClick={() => { setIsLoading(true); setHasError(false) }}
                        className="mt-1 text-[10px] text-claude-accent hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    // Show image (either loaded or external URL)
    if (actualSrc || (effectiveSrc?.startsWith('http') && !isDownloading)) {
        return (
            <div className="relative my-2 inline-block">
                <img
                    key={src}
                    src={actualSrc || effectiveSrc}
                    alt={alt}
                    className="max-w-[200px] w-full h-auto rounded-lg shadow-sm"
                    onError={(e) => {
                        console.error('Img Load Err:', src, e)
                        setHasError(true)
                    }}
                />
            </div>
        )
    }

    // Empty placeholder for external URLs being downloaded
    return null
})

export function ChatArea({ messages, streamingContent, isStreaming, imageDownloads }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // 计时器逻辑
  useEffect(() => {
    if (isStreaming && !streamingContent) {
      // 开始计时
      setElapsedTime(0)
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      // 停止计时
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setElapsedTime(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isStreaming, streamingContent])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const parseContent = (text: string) => {
    const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/
    const match = text.match(thoughtRegex)
    let thought = '', content = text
    if (match) {
        thought = match[1]
        content = text.includes('</thought>') ? text.replace(/<thought>[\s\S]*?<\/thought>/, '').trim() : ''
    }
    return { thought, content }
  }

  const renderAttachments = (raw?: Attachment[] | string) => {
      if (!raw) return null
      let atts: Attachment[] = []
      try { atts = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { return null }
      if (atts.length === 0) return null
      return (
          <div className="flex flex-wrap gap-2 mb-3">
              {atts.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/50 border border-black/5 rounded-lg p-2 pr-4 shadow-sm max-w-[200px]">
                      {att.type.startsWith('image/') ? ( <div className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden"><img src={att.data} alt={att.name} className="w-full h-full object-cover" /></div> ) : ( <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 rounded"><File size={20} className="text-gray-400" /></div> )}
                      <div className="flex flex-col min-w-0"><span className="text-xs font-medium text-gray-700 truncate">{att.name}</span><span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(0)} KB</span></div>
                  </div>
              ))}
          </div>
      )
  }

  const renderMessageContent = (msg: Message, isStreamingMsg = false) => {
    const { thought, content } = parseContent(msg.content)
    return (
      <div className="space-y-3 w-full">
        {renderAttachments(msg.attachments)}
        {thought && (
          <div className="bg-black/[0.03] border border-black/[0.03] rounded-xl overflow-hidden transition-all">
            <details className="group" open={isStreamingMsg}><summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-black/[0.05] transition-colors list-none"><BrainCircuit size={14} className="text-claude-accent opacity-70" /><span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Thinking</span><ChevronDown size={14} className="ml-auto text-gray-300 group-open:rotate-180 transition-transform" /></summary><div className="px-4 pb-3 pt-1 text-[13px] text-gray-500 leading-relaxed italic border-t border-black/[0.02]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{thought}</ReactMarkdown></div></details>
          </div>
        )}
        {content && (
           <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(url) => {
                        // Ensure flyai:// URLs are preserved
                        if (url.startsWith('flyai://')) {
                            return url
                        }
                        return url
                    }}
                    components={{
                        img: ({ node, ...props }) => <ImageWithLoading {...props} imageDownloads={imageDownloads} />,
                        code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''
                            const inline = !className

                            if (!inline && language) {
                                return (
                                    <div className="my-3 rounded-lg overflow-hidden border border-black/5 shadow-sm">
                                        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">{language}</span>
                                        </div>
                                        <SyntaxHighlighter
                                            style={vscDarkPlus as any}
                                            language={language}
                                            PreTag="div"
                                            className="!mt-0 !rounded-t-none"
                                            customStyle={{
                                                margin: 0,
                                                borderRadius: '0 0 0.5rem 0.5rem'
                                            }}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                )
                            }

                            if (!inline) {
                                return (
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800 border border-gray-200">
                                        {children}
                                    </code>
                                )
                            }

                            return (
                                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-gray-800">
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
           </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 pt-12">
        {messages.length === 0 && !isStreaming ? (
            <div className="max-w-2xl mx-auto mt-20 text-center space-y-6"><div className="w-16 h-16 bg-white rounded-3xl shadow-sm mx-auto flex items-center justify-center border border-black/5 rotate-3"><ImageIcon className="text-claude-accent" size={32} /></div><div className="space-y-2"><h1 className="text-3xl font-serif text-gray-800 tracking-tight">How can I help you?</h1><p className="text-gray-400 text-sm">Create and reason with FlyAi.</p></div></div>
        ) : (
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
                {messages.map((msg) => (
                    <div key={msg.id} className={clsx("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all shadow-sm", msg.role === 'user' ? "bg-white text-gray-400 border-gray-100 mt-1" : "bg-claude-accent text-white border-claude-accent shadow-sm mt-1")}>{msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div>
                        <div className={clsx("max-w-[85%] min-w-0", msg.role === 'user' ? "flex flex-col items-end" : "flex-1")}>
                             <div className={clsx("w-full", msg.role === 'user' ? "bg-[#f3f3ee] px-4 py-3 rounded-[20px] rounded-tr-none text-gray-800 shadow-sm border border-black/5" : "")}>{renderMessageContent(msg)}</div>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-lg bg-claude-accent text-white flex items-center justify-center shrink-0 border border-claude-accent shadow-sm mt-1"><Bot size={16} /></div>
                        <div className="flex-1 min-w-0">
                            {streamingContent ? (
                                renderMessageContent({ id: 'streaming', role: 'model', content: streamingContent, type: 'text' }, true)
                            ) : (
                                <div className="flex flex-col items-start gap-3 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Loader2 size={24} className="animate-spin text-claude-accent" />
                                            <div className="absolute inset-0 animate-ping opacity-20">
                                                <Loader2 size={24} className="text-claude-accent" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">Thinking...</span>
                                            <span className="text-xs text-gray-400">{formatTime(elapsedTime)}</span>
                                        </div>
                                    </div>
                                    {/* 进度条动画 */}
                                    <div className="w-full max-w-[200px] h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-claude-accent animate-pulse rounded-full" style={{
                                            width: '60%',
                                            animation: 'shimmer 1.5s infinite'
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} className="h-4" />
            </div>
        )}
    </div>
  )
}