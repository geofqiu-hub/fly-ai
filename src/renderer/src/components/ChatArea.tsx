import React, { useState } from 'react'
import { Image as ImageIcon, User, Bot, AlertCircle, RefreshCw, Paperclip, X, ZoomIn, Download } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { prism as lightTheme } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../types/chat'

interface Props {
  messages: Message[]
  streamingContent: string
  isStreaming: boolean
  activeTool?: { name: string; args: any } | null
  error: string | null
  onRetry?: () => void
}

export function ChatArea({ messages, streamingContent, isStreaming, activeTool, error, onRetry }: Props) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent, error])

  const renderCode = ({ node, inline, className, children, ...props }: any) => {
    const content = String(children);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    // 1. 处理行内代码 (Inline Code) - 仅改变颜色，无背景
    if (inline) {
      return (
        <code className="text-claude-accent font-mono font-bold mx-0.5" {...props}>
          {children}
        </code>
      );
    }

    // 2. 拦截工具调用 JSON
    try {
      if (content.trim().startsWith('{') && content.includes('"action"')) {
        const toolCall = JSON.parse(content.trim());
        return (
          <div className="my-4 p-4 bg-[#f9f9f8] rounded-xl border border-black/5 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-claude-accent/10 flex items-center justify-center text-claude-accent">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Assistant Tool</div>
              <div className="text-sm font-semibold text-gray-700 truncate">{toolCall.action}</div>
              {toolCall.thought && (
                <div className="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2 line-clamp-1">
                  {toolCall.thought}
                </div>
              )}
            </div>
          </div>
        );
      }
    } catch (e) {}

    // 3. 处理块级代码 (Block Code) - 浅色背景
    const lineCount = content.split('\n').length;
    const isSingleLine = lineCount <= 1;

    return (
      <span className={clsx(
        "group relative rounded-lg overflow-hidden border border-black/[0.06] bg-[#f7f7f5] transition-all",
        isSingleLine ? "inline-block align-middle mx-1 px-1.5 py-0.5 min-w-[20px] text-claude-accent font-bold" : "block my-4 first:mt-0 last:mb-0 w-full"
      )}>
        {!isSingleLine && language && (
          <div className="absolute right-3 top-2 px-1.5 py-0.5 bg-black/5 text-black/30 text-[9px] font-bold rounded uppercase tracking-wider z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {language}
          </div>
        )}
        <SyntaxHighlighter
          style={lightTheme}
          language={language || 'text'}
          PreTag="span"
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
              display: isSingleLine ? 'inline' : 'block'
            }
          }}
          customStyle={{
            margin: 0,
            padding: isSingleLine ? '0' : '1.25rem',
            fontSize: isSingleLine ? '0.95em' : '13px',
            lineHeight: isSingleLine ? '1' : '1.6',
            backgroundColor: 'transparent',
            display: isSingleLine ? 'inline' : 'block'
          }}
          {...props}
        >
          {content.replace(/\n$/, '')}
        </SyntaxHighlighter>
      </span>
    );
  };

  const renderParagraph = ({ node, children, ...props }: any) => {
    const content = React.Children.toArray(children).join('');
    // 激进匹配：即使没有代码块包裹的 JSON 也会被转化为卡片
    if (content.trim().startsWith('{') && content.includes('"action":') && content.includes('"action_input":')) {
      try {
        const toolCall = JSON.parse(content.trim());
        return (
          <div className="my-4 p-4 bg-[#f9f9f8] rounded-xl border border-black/5 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-claude-accent/10 flex items-center justify-center text-claude-accent">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">执行工具 (模拟)</div>
              <div className="text-sm font-semibold text-gray-700 truncate">{toolCall.action}</div>
            </div>
          </div>
        );
      } catch (e) {}
    }
    return <p {...props}>{children}</p>;
  };

  const renderImage = ({ node, ...props }: any) => {
    console.log('[Renderer] Rendering image:', props.src);
    
    return (
      <span className="block my-4 group relative w-fit">
        <img
          {...props}
          onClick={() => setPreviewUrl(props.src)}
          className="w-[15vw] min-w-[150px] h-auto rounded-2xl border border-black/10 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-zoom-in"
          loading="lazy"
          onError={(e) => {
            console.error('[Renderer] Image load failed:', props.src);
          }}
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            window.api.downloadFile({ url: props.src });
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          title="Save As..."
        >
          <Download size={14} />
        </button>
      </span>
    );
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {messages.length === 0 && !isStreaming && !error ? (
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-sm mx-auto flex items-center justify-center border border-black/5 rotate-3">
            <ImageIcon className="text-claude-accent" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-serif text-gray-800 tracking-tight">How can I help you?</h1>
            <p className="text-gray-400 text-sm">Create and reason with FlyAi.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          {messages.map((msg) => (
            <div key={msg.id} className={clsx("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all shadow-sm", msg.role === 'user' ? "bg-white text-gray-400 border-gray-100 mt-1" : "bg-claude-accent text-white border-claude-accent shadow-sm mt-1")}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={clsx("max-w-[85%] min-w-0", msg.role === 'user' ? "flex flex-col items-end" : "flex-1")}>
                <div className={clsx("w-full", msg.role === 'user' ? "bg-[#f3f3ee] px-4 py-3 rounded-[20px] rounded-tr-none text-gray-800 shadow-sm border border-black/5" : "")}>
                  <div className={clsx("text-gray-800 min-w-0 flex flex-col gap-3", msg.role === 'assistant' ? "prose prose-claude max-w-none" : "whitespace-pre-wrap leading-relaxed")}>
                    {msg.role === 'assistant' ? (
                      <div className="space-y-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          urlTransform={(uri) => {
                            // 允许 chat-file 协议，否则会被过滤成空字符串
                            if (uri.startsWith('chat-file://')) return uri;
                            return uri;
                          }}
                          components={{
                            p: renderParagraph,
                            img: renderImage,
                            code: renderCode
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}

                    {/* Attachments rendering */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className={clsx("flex flex-wrap gap-3 mt-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        {msg.attachments.map((file: any, idx: number) => (
                          <div key={idx} className="group relative">
                            {file.type?.startsWith('image/') ? (
                              <img 
                                src={file.data} 
                                alt={file.name} 
                                className="max-w-full max-h-[300px] rounded-xl border border-black/10 shadow-sm object-contain transition-all hover:shadow-md bg-white p-1"
                              />
                            ) : (
                              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-black/10 shadow-sm text-gray-700 hover:shadow-md transition-all cursor-default min-w-[160px] max-w-[240px]">
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg border border-black/5 shrink-0">
                                  <Paperclip size={18} className="text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate" title={file.name}>{file.name}</div>
                                  {file.size && (
                                    <div className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(isStreaming || (streamingContent && error)) && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-claude-accent text-white flex items-center justify-center shrink-0 border border-claude-accent shadow-sm mt-1">
                <Bot size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="prose prose-claude max-w-none text-gray-800">
                  {streamingContent ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(uri) => {
                        if (uri.startsWith('chat-file://')) return uri;
                        return uri;
                      }}
                      components={{
                        p: renderParagraph,
                        img: renderImage,
                        code: renderCode
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                  ) : (
                    isStreaming && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    )
                  )}

                  {activeTool && (
                    <div className="my-4 p-4 bg-[#f9f9f8] rounded-xl border border-black/5 flex items-center gap-3 shadow-sm animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-claude-accent/10 flex items-center justify-center text-claude-accent">
                        {activeTool.name === 'generate_image' ? <ImageIcon size={18} /> : <Bot size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                          {activeTool.name === 'generate_image' ? 'Generating Image' : 'Executing Tool'}
                        </div>
                        <div className="text-sm font-semibold text-gray-700 truncate">
                          {activeTool.name === 'generate_image' ? `Creating: ${activeTool.args.prompt}` : activeTool.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex gap-1">
                            <span className="w-1 h-1 bg-claude-accent/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-claude-accent/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-claude-accent/40 rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-[10px] text-claude-accent/60 font-medium">Please wait...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100 mt-1">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">
                <div className="bg-red-50/50 border border-red-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-red-600 font-medium mb-1">Service Error</p>
                  <p className="text-sm text-red-500/80 line-clamp-2 mb-3">{error}</p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={onRetry}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 bg-red-100/50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <RefreshCw size={12} className={clsx(isStreaming && "animate-spin")} />
                      Retry Message
                    </button>
                    <span className="text-xs text-red-400">
                      or send a new message.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <button 
              className="p-3 bg-black/10 hover:bg-black/20 rounded-full text-gray-800 transition-colors"
              onClick={() => setPreviewUrl(null)}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-auto h-auto max-w-[800px] max-h-[80vh] object-contain rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
