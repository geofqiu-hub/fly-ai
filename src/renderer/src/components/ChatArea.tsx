import React from 'react'
import { Image as ImageIcon, User, Bot, BrainCircuit, ChevronDown, File } from 'lucide-react'
import clsx from 'clsx'

interface Attachment { name: string; type: string; data: string; size: number }
interface Message { id: string; role: 'user' | 'model'; content: string; type: 'text' | 'image'; thought?: string; attachments?: Attachment[] | string }
interface Props { messages: Message[]; streamingContent: string; isStreaming: boolean }

export function ChatArea({ messages, streamingContent, isStreaming }: Props) {
  // TODO: 实现自动滚动逻辑
  // TODO: 实现计时器逻辑
  // TODO: 实现内容解析逻辑
  // TODO: 实现附件渲染逻辑
  // TODO: 实现图片加载逻辑

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10">
        {messages.length === 0 && !isStreaming ? (
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
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
                {messages.map((msg) => (
                    <div key={msg.id} className={clsx("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all shadow-sm", msg.role === 'user' ? "bg-white text-gray-400 border-gray-100 mt-1" : "bg-claude-accent text-white border-claude-accent shadow-sm mt-1")}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={clsx("max-w-[85%] min-w-0", msg.role === 'user' ? "flex flex-col items-end" : "flex-1")}>
                             <div className={clsx("w-full", msg.role === 'user' ? "bg-[#f3f3ee] px-4 py-3 rounded-[20px] rounded-tr-none text-gray-800 shadow-sm border border-black/5" : "")}>
                                {/* TODO: 实现消息内容渲染 */}
                                {msg.content}
                             </div>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-claude-accent text-white flex items-center justify-center shrink-0 border border-claude-accent shadow-sm mt-1">
                            <Bot size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* TODO: 实现流式内容渲染 */}
                            <div className="text-sm text-gray-500">Thinking...</div>
                        </div>
                    </div>
                )}
                <div className="h-4" />
            </div>
        )}
    </div>
  )
}
