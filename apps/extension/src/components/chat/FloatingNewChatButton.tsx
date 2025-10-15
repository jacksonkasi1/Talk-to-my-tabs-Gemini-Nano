// apps/extension/src/components/chat/FloatingNewChatButton.tsx

// ** import core packges
import React from 'react'
import { MessageCirclePlus, X } from 'lucide-react'

// ** import styles
import '@/styles/floating-button.css'

interface FloatingNewChatButtonProps {
  onStartNewChat: () => void
  onDismiss: () => void
  pageTitle: string
}

const FloatingNewChatButton: React.FC<FloatingNewChatButtonProps> = ({
  onStartNewChat,
  onDismiss,
  pageTitle
}) => {
  return (
    <div
      className="floating-button-container fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-md"
      style={{
        backgroundColor: 'var(--chip-bg)',
        color: 'var(--chip-text)',
        maxWidth: '240px'
      }}
    >
      <button
        onClick={onStartNewChat}
        className="new-chat-button flex items-center gap-1.5 flex-1 min-w-0 text-left"
        aria-label={`Start new chat about ${pageTitle}`}
      >
        <MessageCirclePlus className="w-4 h-4 shrink-0" />
        <span 
          className="text-xs font-medium truncate"
          title={`New chat • ${pageTitle}`}
        >
          New chat • {pageTitle}
        </span>
      </button>

      <button
        onClick={onDismiss}
        className="close-button p-1 rounded-full shrink-0"
        aria-label="Dismiss"
      >
        <X className="close-icon w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default FloatingNewChatButton