// apps/extension/src/components/chat/ChatInput.tsx
// ** import core packages
import React, { useRef, useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask about this page..."
}) => {
  const [inputText, setInputText] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  const handleSend = () => {
    if (!inputText.trim() || disabled) return
    onSendMessage(inputText.trim())
    setInputText("")
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      borderTop: `1px solid var(--divider)`,
      backgroundColor: 'var(--bg)'
    }}>
      <div className="max-w-2xl mx-auto p-4">
        <div
          className="relative flex items-end rounded-full transition-all duration-200"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: `1px solid var(--border)`
          }}
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm resize-none outline-none bg-transparent max-h-20 leading-relaxed rounded-full"
            style={{
              minHeight: '38px',
              color: 'var(--text-primary)'
            }}
            disabled={disabled}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || disabled}
            className={`
              my-auto mx-1 w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200
              ${inputText.trim() && !disabled ? 'hover:scale-105' : 'cursor-not-allowed'}
            `}
            style={{
              backgroundColor: inputText.trim() && !disabled
                ? 'var(--chip-bg)'
                : 'var(--disabled-bg)',
              color: inputText.trim() && !disabled
                ? 'var(--chip-text)'
                : 'var(--disabled-text)'
            }}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput