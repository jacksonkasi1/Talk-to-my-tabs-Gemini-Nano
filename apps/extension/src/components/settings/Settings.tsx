// apps/extension/src/components/settings/Settings.tsx
// ** import types
import type { FC } from 'react'

// ** import core packages
import React, { useState, useEffect } from 'react'
import { X, Check, Info } from 'lucide-react'

// ** import utils
import { checkChromeAI, getSetupInstructions } from '@/utils/chrome-ai-check'
import { testChromeAI } from '@/utils/test-chrome-ai'

interface SettingsProps {
  onClose: () => void
}

interface AISettings {
  temperature: number
  topK: number
}

const DEFAULT_AI_SETTINGS: AISettings = {
  temperature: 0.7,
  topK: 3
}

const Settings: FC<SettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS)
  const [chromeAIReady, setChromeAIReady] = useState(false)
  const [chromeAIMessage, setChromeAIMessage] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string>("")

  useEffect(() => {
    // Check Chrome AI availability
    checkChromeAI().then(status => {
      setChromeAIReady(status.available)
      setChromeAIMessage(status.message)
    })

    // Load AI settings from Chrome storage
    chrome.storage.local.get(['aiSettings'], (result) => {
      if (result.aiSettings) {
        setSettings(result.aiSettings)
      }
    })

    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save AI settings to Chrome storage
      await chrome.storage.local.set({ aiSettings: settings })
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    handleClose()
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 200)
  }

  const handleTestAI = async () => {
    setIsTesting(true)
    setTestResult("")
    
    try {
      const result = await testChromeAI()
      setTestResult(result.success ? '✅ ' + result.message : '❌ ' + result.message)
      
      if (result.success) {
        setChromeAIReady(true)
        setChromeAIMessage('Chrome AI is ready')
      }
    } catch (error) {
      setTestResult('❌ Test failed: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200"
      style={{
        backgroundColor: isVisible && !isClosing ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
        opacity: isVisible && !isClosing ? 1 : 0
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-xl transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'var(--bg)',
          transform: isVisible && !isClosing ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          opacity: isVisible && !isClosing ? 1 : 0
        }}
      >
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-tertiary)'
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Chrome AI Status */}
          <div 
            className="p-3 rounded-md flex items-start gap-2"
            style={{ 
              backgroundColor: chromeAIReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${chromeAIReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            <Info className="w-4 h-4 mt-0.5" style={{ 
              color: chromeAIReady ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' 
            }} />
            <div className="flex-1">
              <div className="text-sm font-medium mb-1" style={{ 
                color: chromeAIReady ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' 
              }}>
                {chromeAIReady ? 'Chrome AI Ready' : 'Chrome AI Not Available'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {chromeAIMessage}
              </div>
              {!chromeAIReady && (
                <div className="text-xs mt-2 space-y-1" style={{ color: 'var(--text-tertiary)' }}>
                  {getSetupInstructions().map((instruction, i) => (
                    <div key={i}>{instruction}</div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleTestAI}
                  disabled={isTesting}
                  className="mt-2 px-3 py-1 text-xs rounded transition-all"
                  style={{
                    backgroundColor: 'var(--chip-bg)',
                    color: 'var(--chip-text)',
                    opacity: isTesting ? 0.5 : 1
                  }}
                >
                  {isTesting ? 'Testing...' : 'Test AI'}
                </button>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  ⚠️ Note: Chrome AI is experimental. If test causes issues, try testing in browser console instead.
                </div>
              </div>
              {testResult && (
                <div className="text-xs mt-2 p-2 rounded" style={{ 
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-secondary)'
                }}>
                  {testResult}
                </div>
              )}
            </div>
          </div>

          {/* AI Model Information */}
          <div>
            <label 
              className="block text-sm font-medium mb-2" 
              style={{ color: 'var(--text-primary)' }}
            >
              AI Model
            </label>
            <div 
              className="px-3 py-2 rounded-md text-sm"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--divider)'
              }}
            >
              Gemini Nano (Chrome Built-in)
            </div>
          </div>

          {/* Temperature Setting */}
          <div>
            <label 
              className="block text-sm font-medium mb-2" 
              style={{ color: 'var(--text-primary)' }}
            >
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
              style={{ accentColor: 'var(--chip-bg)' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Top-K Setting */}
          <div>
            <label 
              className="block text-sm font-medium mb-2" 
              style={{ color: 'var(--text-primary)' }}
            >
              Top-K: {settings.topK}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.topK}
              onChange={(e) => setSettings(prev => ({ ...prev, topK: parseInt(e.target.value) }))}
              className="w-full"
              style={{ accentColor: 'var(--chip-bg)' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              <span>Focused</span>
              <span>Diverse</span>
            </div>
          </div>
        </div>

        <div 
          className="flex justify-end gap-2 p-4"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2"
            style={{
              backgroundColor: saveSuccess ? '#10b981' : 'var(--chip-bg)',
              color: 'var(--chip-text)',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings