// apps/extension/src/components/chat/SessionHeader.tsx
// ** import core packages
import React from 'react'
import { Globe, RefreshCw, Paintbrush } from 'lucide-react'

interface SessionHeaderProps {
  title: string
  domain: string
  onRefresh: () => void
  onClear: () => void
}

const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  domain,
  onRefresh,
  onClear
}) => {
  return (
    <div className="px-4 py-3 border-b sticky top-0 z-10" style={{ 
      borderColor: 'var(--divider)',
      backgroundColor: 'var(--bg)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
            {domain}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-opacity-10 transition-all"
          style={{ backgroundColor: 'transparent' }}
          title="Reload page content"
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        </button>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-opacity-10 transition-all"
          style={{ backgroundColor: 'transparent' }}
          title="Clear chat history"
        >
          <Paintbrush className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        </button>
      </div>
    </div>
  )
}

export default SessionHeader