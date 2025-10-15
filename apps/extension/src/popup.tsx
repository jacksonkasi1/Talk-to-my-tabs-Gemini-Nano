// apps/extension/src/popup.tsx
// ** import core packages
import React, { useState, useEffect } from 'react'
import { 
  Wand2, 
  AlertCircle, 
  Settings, 
  ChevronLeft, 
  ChevronDown,
  Sparkles,
  Layout,
  BookOpen,
  MessageSquare,
  RotateCcw,
  Type,
  Palette
} from 'lucide-react'

// ** import utils
import { checkChromeAI, getSetupInstructions } from '@/utils/chrome-ai-check'

// ** import styles
import '@/styles/style.css'
import '@/styles/popup.css'

type SimplificationLevel = 'Low' | 'Mid' | 'High'
type OptimizationMode = 'simplify-complex' | 'visual-organization' | 'reading-flow'
type View = 'main' | 'settings'
type PageTheme = 'default' | 'cream' | 'dark' | 'sepia'

interface DisplaySettings {
  enabled: boolean
  useOpenDyslexic: boolean
  lineSpacing: number
  letterSpacing: number
  wordSpacing: number
  pageTheme: PageTheme
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  enabled: false,
  useOpenDyslexic: false,
  lineSpacing: 1.4,
  letterSpacing: 1,
  wordSpacing: 0,
  pageTheme: 'default'
}

const PAGE_THEMES = [
  { value: 'default', label: 'Default', color: '#ffffff' },
  { value: 'cream', label: 'Cream Paper', color: '#FDF6E3' },
  { value: 'dark', label: 'Dark Mode', color: '#1a1a1b' },
  { value: 'sepia', label: 'Sepia', color: '#F4ECD8' }
] as const

const OPTIMIZATION_OPTIONS = [
  { 
    value: 'simplify-complex', 
    label: 'Simplify Complex',
    icon: Sparkles,
    description: 'Make complex ideas easier'
  },
  { 
    value: 'visual-organization', 
    label: 'Visual Organization',
    icon: Layout,
    description: 'Better structure & layout'
  },
  { 
    value: 'reading-flow', 
    label: 'Reading Flow',
    icon: BookOpen,
    description: 'Smoother reading experience'
  }
] as const

function ExtensionPopup() {
  const [level, setLevel] = useState<SimplificationLevel>('Low')
  const [mode, setMode] = useState<OptimizationMode>('simplify-complex')
  const [isProcessing, setIsProcessing] = useState(false)
  const [chromeAIReady, setChromeAIReady] = useState(false)
  const [chromeAIMessage, setChromeAIMessage] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('main')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS)

  useEffect(() => {
    // Apply theme from localStorage
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    // Load display settings from Chrome storage
    chrome.storage.local.get(['displaySettings'], (result) => {
      if (result.displaySettings) {
        setDisplaySettings(result.displaySettings)
      }
    })

    // Check for Chrome AI
    checkChromeAI().then(status => {
      setChromeAIReady(status.available)
      setChromeAIMessage(status.message)
    })

    // Apply current display settings when popup opens
    chrome.storage.local.get(['displaySettings'], (result) => {
      if (result.displaySettings) {
        chrome.runtime.sendMessage({
          action: 'applyDisplaySettings',
          data: { displaySettings: result.displaySettings }
        }).catch(error => {
          console.error('Failed to apply initial display settings:', error)
        })
      }
    })
  }, [])

  useEffect(() => {
    // Save to Chrome storage
    chrome.storage.local.set({ displaySettings })

    // Apply display settings to current page immediately
    chrome.runtime.sendMessage({
      action: 'applyDisplaySettings',
      data: { displaySettings }
    }).catch(error => {
      console.error('Failed to apply display settings:', error)
    })
  }, [displaySettings])

  const handleSimplify = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'simplifyText',
        data: { 
          level, 
          mode,
          displaySettings // Include display settings in the message
        }
      })

      if (response?.success) {
        window.close()
      } else {
        setError(response?.error || 'Failed to simplify')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') })
  }

  const handleOpenChat = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.windowId) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId })
        window.close()
      }
    })
  }

  const resetDisplaySettings = () => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS)
  }

  const selectedOption = OPTIMIZATION_OPTIONS.find(o => o.value === mode)!

  if (!chromeAIReady) {
    const instructions = getSetupInstructions()
    return (
      <div className="popup-container">
        <div className="empty-state">
          <div className="empty-icon">
            <AlertCircle />
          </div>
          <h2>Chrome AI Not Available</h2>
          <p style={{ marginBottom: '12px' }}>{chromeAIMessage}</p>
          <div style={{ fontSize: '10px', textAlign: 'left', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--card-bg)', borderRadius: '6px' }}>
            {instructions.map((instruction, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>{instruction}</div>
            ))}
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary">
            <RotateCcw className="btn-icon" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div className="popup-container">
        {/* Settings Header */}
        <div className="popup-header">
          <button onClick={() => setView('main')} className="icon-btn compact">
            <ChevronLeft />
          </button>
          <h2>Display Settings</h2>
          <div style={{ width: 24 }} />
        </div>

        <div className="settings-content">
          {/* Master Enable/Disable Toggle */}
          <div className="setting-item" style={{ marginBottom: '16px' }}>
            <div className="setting-label">
              <span className="setting-title">Enable Display Settings</span>
            </div>
            <button
              className={`toggle-switch ${displaySettings.enabled ? 'active' : ''}`}
              onClick={() => setDisplaySettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          <div style={{ opacity: displaySettings.enabled ? 1 : 0.5, pointerEvents: displaySettings.enabled ? 'auto' : 'none' }}>
            {/* Theme Selector - Circles */}
            <div style={{ marginBottom: '14px' }}>
              <label className="control-label">THEME</label>
              <div className="theme-grid-circles">
                {PAGE_THEMES.map(theme => (
                  <button
                    key={theme.value}
                    onClick={() => setDisplaySettings(prev => ({ ...prev, pageTheme: theme.value as PageTheme }))}
                    className={`theme-option-circle ${displaySettings.pageTheme === theme.value ? 'active' : ''}`}
                    style={{ backgroundColor: theme.color === '#ffffff' ? '#f3f4f6' : theme.color }}
                  />
                ))}
              </div>
            </div>

            {/* Font Toggle - Compact */}
            <div className="setting-item" style={{ marginBottom: '14px' }}>
              <span className="setting-title">OpenDyslexic Font</span>
              <button
                className={`toggle-switch ${displaySettings.useOpenDyslexic ? 'active' : ''}`}
                onClick={() => setDisplaySettings(prev => ({ ...prev, useOpenDyslexic: !prev.useOpenDyslexic }))}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* Spacing - Individual Lines */}
            <div style={{ marginBottom: '16px' }}>
              <label className="control-label">SPACING</label>

              <div className="slider-control">
                <label>Line Spacing</label>
                <div className="slider-wrapper">
                  <div className="slider-track">
                    <div
                      className="slider-fill"
                      style={{ width: `${((displaySettings.lineSpacing - 1) / (2 - 1)) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="2"
                      step="0.1"
                      value={displaySettings.lineSpacing}
                      onChange={(e) => setDisplaySettings(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                      className="slider-input"
                    />
                  </div>
                  <span className="slider-value">{displaySettings.lineSpacing.toFixed(1)}</span>
                </div>
              </div>

              <div className="slider-control">
                <label>Letter Spacing</label>
                <div className="slider-wrapper">
                  <div className="slider-track">
                    <div
                      className="slider-fill"
                      style={{ width: `${(displaySettings.letterSpacing / 3) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.5"
                      value={displaySettings.letterSpacing}
                      onChange={(e) => setDisplaySettings(prev => ({ ...prev, letterSpacing: parseFloat(e.target.value) }))}
                      className="slider-input"
                    />
                  </div>
                  <span className="slider-value">{displaySettings.letterSpacing}px</span>
                </div>
              </div>

              <div className="slider-control">
                <label>Word Spacing</label>
                <div className="slider-wrapper">
                  <div className="slider-track">
                    <div
                      className="slider-fill"
                      style={{ width: `${(displaySettings.wordSpacing / 5) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={displaySettings.wordSpacing}
                      onChange={(e) => setDisplaySettings(prev => ({ ...prev, wordSpacing: parseFloat(e.target.value) }))}
                      className="slider-input"
                    />
                  </div>
                  <span className="slider-value">{displaySettings.wordSpacing}px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Button - Compact */}
          <button onClick={resetDisplaySettings} className="btn-secondary compact full-width">
            <RotateCcw className="btn-icon" />
            Reset
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <h2>Simplify Article</h2>
        <button onClick={() => setView('settings')} className="icon-btn compact">
          <Settings />
        </button>
      </div>

      <div className="popup-content">
        {/* Simplification Level */}
        <div className="control-group">
          <label className="control-label">INTENSITY</label>
          <div className="level-selector">
            {(['Low', 'Mid', 'High'] as SimplificationLevel[]).map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`level-btn ${level === l ? 'active' : ''}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Optimization Mode */}
        <div className="control-group">
          <label className="control-label">OPTIMIZATION</label>
          <div className="dropdown-container">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
            >
              <div className="dropdown-selected">
                <selectedOption.icon className="dropdown-icon" />
                <span>{selectedOption.label}</span>
              </div>
              <ChevronDown className="dropdown-arrow" />
            </button>
            
            {dropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setDropdownOpen(false)} />
                <div className="dropdown-menu">
                  {OPTIMIZATION_OPTIONS.map(option => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setMode(option.value as OptimizationMode)
                          setDropdownOpen(false)
                        }}
                        className={`dropdown-item ${mode === option.value ? 'active' : ''}`}
                      >
                        <Icon className="dropdown-item-icon" />
                        <div className="dropdown-item-content">
                          <span className="dropdown-item-label">{option.label}</span>
                          <span className="dropdown-item-description">{option.description}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleSimplify}
            disabled={isProcessing}
            className="btn-primary chip compact full-width"
          >
            <Wand2 className={`btn-icon ${isProcessing ? 'spinning' : ''}`} />
            {isProcessing ? 'Processing...' : 'Generate'}
          </button>

          <button onClick={handleOpenChat} className="btn-secondary compact full-width">
            <MessageSquare className="btn-icon" />
            Open Chat
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExtensionPopup;