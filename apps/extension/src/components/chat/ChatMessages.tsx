// apps/extension/src/components/chat/ChatMessages.tsx
// ** import types
import type { Message } from '@/store/chatStore'

// ** import core packages
import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import MarkdownIt from 'markdown-it'

// ** import styles
import '@/styles/markdown.css'

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize markdown parser
  const md: any = useMemo(() => {
    return new MarkdownIt({
      html: false, // Disable HTML for security
      breaks: true, // Convert line breaks to <br>
      linkify: true, // Auto-convert URLs to links
      typographer: true, // Smart quotes and dashes
      highlight: function (str, lang) {
        if (lang) {
          return `<pre class="language-${lang}"><code class="language-${lang}">${md.utils.escapeHtml(str)}</code></pre>`
        }
        return `<pre><code>${md.utils.escapeHtml(str)}</code></pre>`
      }
    })
  }, [])

  // Render message content as markdown for AI responses
  const renderMessageContent = (message: Message) => {
    if (message.isUser) {
      // Keep user messages as plain text with line breaks
      return (
        <div className="text-sm leading-relaxed whitespace-pre-wrap pr-8">
          {message.text}
        </div>
      )
    } else {
      // Render AI responses as markdown
      const renderedContent = md.render(message.text)
      return (
        <div
          className="markdown-content text-sm leading-relaxed pr-8"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      )
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="group"
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            <div
              className="py-4 px-4 transition-colors duration-200"
              style={{
                backgroundColor: message.isUser ? 'var(--bg)' : 'var(--card-bg)'
              }}
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                    style={{
                      backgroundColor: message.isUser ? 'var(--chip-bg)' : 
                                      message.isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)',
                      color: message.isUser ? 'var(--chip-text)' : 
                            message.isError ? '#ef4444' : 'var(--text-primary)',
                      border: !message.isUser ? `1px solid ${message.isError ? '#ef4444' : 'var(--border)'}` : 'none'
                    }}
                  >
                    {message.isUser ? 'U' : message.isError ? '!' : 'A'}
                  </div>

                  <div className="flex-1 min-w-0 relative">
                    <div style={{ color: message.isError ? '#ef4444' : 'var(--text-primary)' }}>
                      {renderMessageContent(message)}
                    </div>

                    {!message.isError && (
                      <button
                        onClick={() => handleCopy(message.text, message.id)}
                        className={`
                          absolute top-0 right-0 w-6 h-6 rounded-full 
                          flex items-center justify-center
                          transition-all duration-200
                          ${hoveredMessage === message.id ? 'opacity-100' : 'opacity-0'}
                        `}
                        style={{
                          backgroundColor: hoveredMessage === message.id ? 'var(--secondary-bg)' : 'transparent'
                        }}
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3" style={{ color: '#10b981' }} />
                        ) : (
                          <Copy className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            className="py-4 px-4 animate-fadeIn"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="max-w-2xl mx-auto flex gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: `1px solid var(--border)`,
                  color: 'var(--text-primary)'
                }}
              >
                A
              </div>
              <div className="flex items-center gap-1 pt-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" 
                  style={{ backgroundColor: 'var(--text-tertiary)' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-75" 
                  style={{ backgroundColor: 'var(--text-tertiary)' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-150" 
                  style={{ backgroundColor: 'var(--text-tertiary)' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatMessages