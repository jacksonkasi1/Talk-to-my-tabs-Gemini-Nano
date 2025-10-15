// KeyboardShortcuts.tsx

// ** import types
import type { FC } from "react"

// ** import core packages
import React from "react"

interface KeyboardShortcutsProps {
  showHelp: boolean
  onToggleHelp: () => void
}

const KeyboardShortcuts: FC<KeyboardShortcutsProps> = ({ showHelp, onToggleHelp }) => {
  return (
    <>
      <button
        onClick={onToggleHelp}
        className="fixed bottom-6 right-6 w-10 h-10 chip flex items-center justify-center shadow-sm"
        title="Keyboard shortcuts (?)"
      >
        <span className="text-sm font-medium">?</span>
      </button>

      {showHelp && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
            onClick={onToggleHelp}
          />
          <div 
            className="fixed bottom-20 right-6 rounded-lg shadow-lg p-4 z-50 animate-fadeIn"
            style={{ 
              backgroundColor: 'var(--popover-bg)',
              border: '1px solid var(--border)'
            }}
          >
            <h3 
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Keyboard shortcuts
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Search', key: '/' },
                { label: 'Next article', key: '→' },
                { label: 'Previous article', key: '←' },
                { label: 'Open original', key: 'o' },
                { label: 'Close/Home', key: 'Esc' },
                { label: 'Toggle help', key: '?' }
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex justify-between gap-8">
                  <span style={{ color: 'var(--text-tertiary)' }}>{shortcut.label}</span>
                  <kbd 
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--text-primary)' 
                    }}
                  >
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default KeyboardShortcuts