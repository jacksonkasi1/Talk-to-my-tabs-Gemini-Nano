// apps/extension/src/components/chat/ContentWarning.tsx
// ** import types
import type { FC } from "react"

// ** import core packages
import React from "react"
import { AlertCircle, FileText } from "lucide-react"

interface ContentWarningProps {
  contentLength: number
  estimatedTokens: number
  onProceed: () => void
  onCancel: () => void
  pageTitle: string
}

const ContentWarning: FC<ContentWarningProps> = ({
  contentLength,
  estimatedTokens,
  onProceed,
  onCancel,
  pageTitle
}) => {
  const formatNumber = (num: number): string => {
    if (num < 1000) return num.toString()
    if (num < 1000000) return `${(num / 1000).toFixed(1)}k`
    return `${(num / 1000000).toFixed(1)}m`
  }

  const isHighUsage = estimatedTokens > 8000

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Icon */}
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <AlertCircle
              className="w-8 h-8"
              style={{ color: isHighUsage ? '#ef4444' : '#f59e0b' }}
            />
          </div>

          {/* Title */}
          <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Large Content Detected
          </h2>

          {/* Description */}
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            This page contains <strong>{formatNumber(contentLength)} characters</strong> and will use approximately{' '}
            <strong style={{ color: isHighUsage ? '#ef4444' : '#f59e0b' }}>
              {formatNumber(estimatedTokens)} tokens
            </strong>.
          </p>

          {/* Page Info */}
          <div
            className="flex items-center gap-3 p-4 rounded-lg mb-6 text-left"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {pageTitle}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {isHighUsage ? 'High token usage' : 'Moderate token usage'}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          <div
            className="text-xs p-4 rounded-lg mb-6"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-tertiary)'
            }}
          >
            {isHighUsage ? (
              'This will consume significant API tokens. Consider asking specific questions for better efficiency.'
            ) : (
              'This will use more tokens than usual but should provide better context for your questions.'
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: isHighUsage ? '#ef4444' : 'var(--chip-bg)',
                color: isHighUsage ? 'white' : 'var(--chip-text)'
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContentWarning