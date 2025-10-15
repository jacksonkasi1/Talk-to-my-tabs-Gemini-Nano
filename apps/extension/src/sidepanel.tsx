// apps/extension/src/sidepanel.tsx
// ** import types
import type { FC } from "react"
import type { ChatMessage as APIChatMessage } from "@/api"
import type { Message } from "@/store/chatStore"

// ** import core packages
import React, { useEffect, useState, useRef } from "react"
import { AlertCircle, RefreshCw, Settings as SettingsIcon } from "lucide-react"

// ** import utils
import { useChatStore } from "@/store/chatStore"
import { useChatSession } from "@/hooks/useChatSession"
import { checkChromeAI, getSetupInstructions } from "@/utils/chrome-ai-check"

// ** import lib
import ChatMessages from "@/components/chat/ChatMessages"
import ChatInput from "@/components/chat/ChatInput"
import SessionHeader from "@/components/chat/SessionHeader"
import FloatingNewChatButton from "@/components/chat/FloatingNewChatButton"
import ContentWarning from "@/components/chat/ContentWarning"

// ** import apis
import { createChatCompletion } from "@/api"

// ** import styles
import "@/styles/style.css"

const SidePanel: FC = () => {
  const [chromeAIReady, setChromeAIReady] = useState(false)
  const [chromeAIMessage, setChromeAIMessage] = useState<string>("")
  const [pendingPageTitle, setPendingPageTitle] = useState<string>("")
  const [pendingPageUrl, setPendingPageUrl] = useState<string>("")
  const [isExtensionInvalid, setIsExtensionInvalid] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const lastActiveTabId = useRef<number | null>(null)
  
  // Check extension validity
  useEffect(() => {
    const checkExtensionValidity = () => {
      if (!chrome.runtime?.id) {
        setIsExtensionInvalid(true)
      }
    }
    
    checkExtensionValidity()
    const interval = setInterval(checkExtensionValidity, 2000)
    
    return () => clearInterval(interval)
  }, [])
  
  const {
    currentSession,
    isLoadingContent,
    showNewChatButton,
    showContentWarning,
    pendingContent,
    initializeSession,
    startNewChat,
    checkForTabChange,
    getDomainFromUrl,
    handleContentWarningProceed,
    handleContentWarningCancel,
    estimateTokens
  } = useChatSession()
  
  const {
    addMessage,
    clearSession,
    setLoadingMessage,
    isLoadingMessage,
    setShowNewChatButton
  } = useChatStore()

  // Apply theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)
  }, [])
  
  // Get current URL for restricted page detection
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url)
      }
    })
  }, [])

  // Check for Chrome AI availability
  useEffect(() => {
    const checkAI = async () => {
      const status = await checkChromeAI()
      setChromeAIReady(status.available)
      setChromeAIMessage(status.message)
    }
    checkAI()
  }, [])

  // Initialize session on mount
  useEffect(() => {
    if (chromeAIReady) {
      initializeSession()
    }
  }, [chromeAIReady])

  // Listen for tab changes and window focus
  useEffect(() => {
    if (!chromeAIReady) return

    const handleTabActivated = (activeInfo: { tabId: number; windowId: number }) => {
      console.log('Tab activated:', activeInfo)
      lastActiveTabId.current = activeInfo.tabId
      
      // Get tab details to check if it's a new page
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.title) {
          setPendingPageTitle(tab.title)
          setPendingPageUrl(tab.url)
        }
      })
      
      // Small delay to ensure tab is fully loaded
      setTimeout(() => {
        checkForTabChange()
      }, 100)
    }
    
    const handleTabUpdated = (
      tabId: number, 
      changeInfo: {
        status?: string
        url?: string
        title?: string
        [key: string]: any
      },
      tab: chrome.tabs.Tab
    ) => {
      // Only process if it's the active tab and status is complete
      if (changeInfo.status === 'complete' && tabId === lastActiveTabId.current) {
        console.log('Tab updated:', tab)
        if (tab.title && tab.url) {
          setPendingPageTitle(tab.title)
          setPendingPageUrl(tab.url)
        }
        checkForTabChange()
      }
    }

    const handleWindowFocusChanged = (windowId: number) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        // Window gained focus, check for tab change
        setTimeout(() => {
          checkForTabChange()
        }, 100)
      }
    }

    // Get initial active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        lastActiveTabId.current = tabs[0].id
        if (tabs[0].title && tabs[0].url) {
          setPendingPageTitle(tabs[0].title)
          setPendingPageUrl(tabs[0].url)
        }
      }
    })
    
    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged)
    
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged)
    }
  }, [chromeAIReady, checkForTabChange])

  const handleSendMessage = async (inputText: string) => {
    if (!currentSession || isLoadingMessage) return
    
    // Check if extension is still valid
    if (!chrome.runtime?.id) {
      setIsExtensionInvalid(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    }

    addMessage(currentSession.domain, userMessage)
    setLoadingMessage(true)

    try {
      // Debug logging
      console.log('=== SIDEBAR CHAT DEBUG ===')
      console.log('Current Session:', currentSession)
      console.log('Has pageContent?', !!currentSession.pageContent)
      console.log('Content length:', currentSession.pageContent?.content?.length || 0)
      console.log('Content preview:', currentSession.pageContent?.content?.substring(0, 200))
      
      const systemPrompt = currentSession.pageContent ? 
        `You are a helpful AI assistant analyzing a webpage. 
        Current page: "${currentSession.title}"
        URL: ${currentSession.url}
        ${currentSession.pageContent.author ? `Author: ${currentSession.pageContent.author}` : ''}
        ${currentSession.pageContent.description ? `Description: ${currentSession.pageContent.description}` : ''}
        
        Page content:
        ${currentSession.pageContent.content}
        
        Instructions:
        - Answer questions based on the content above
        - Be specific and cite relevant parts of the article
        - If asked about something not in the article, acknowledge this
        - Be concise but thorough
        - Use markdown formatting for better readability` :
        'You are a helpful AI assistant.'

      const apiMessages: APIChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt as string
        },
        ...currentSession.messages
          .filter(m => !m.isError && !m.id.startsWith('welcome'))
          .map(m => ({
            role: m.isUser ? 'user' as const : 'assistant' as const,
            content: m.text as string
          })),
        {
          role: 'user',
          content: inputText as string
        }
      ]

      const response = await createChatCompletion(apiMessages, {
        temperature: 0.7,
        max_tokens: 1500
      })
      
      const messageContent = response.choices[0]?.message?.content
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: typeof messageContent === 'string' ? messageContent : 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      }
      
      addMessage(currentSession.domain, aiResponse)
    } catch (error: unknown) {
      console.error('Error calling AI:', error)
      
      let errorMessage = 'Sorry, I encountered an error. Please check your API configuration in Settings.'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        if (axiosError.response?.data?.error?.message) {
          errorMessage = axiosError.response.data.error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        isError: true
      }
      addMessage(currentSession.domain, errorMsg)
    } finally {
      setLoadingMessage(false)
    }
  }

  const handleRefresh = async () => {
    await initializeSession()
  }

  const handleClearSession = () => {
    if (currentSession) {
      clearSession(currentSession.domain)
      initializeSession()
    }
  }

  const handleStartNewChat = async () => {
    setShowNewChatButton(false)
    await startNewChat()
  }

  const handleDismissNewChat = () => {
    setShowNewChatButton(false)
  }

  const handleOpenSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') })
  }

  // Check if we should show the new chat button
  const shouldShowNewChatButton = showNewChatButton && 
    pendingPageTitle && 
    pendingPageUrl &&
    currentSession && 
    (getDomainFromUrl(pendingPageUrl) !== currentSession.domain || pendingPageUrl !== currentSession.url)

  // Show extension invalid message
  if (isExtensionInvalid) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 transition-all duration-300 ease-out" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <RefreshCw className="w-6 h-6 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h2 className="text-lg font-medium mb-2 transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
            Extension Updated
          </h2>
          <p className="text-sm mb-4 transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>
            The extension was updated or reloaded. Please close and reopen this sidebar to continue.
          </p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--chip-bg)',
              color: 'var(--chip-text)'
            }}
          >
            Close Sidebar
          </button>
        </div>
      </div>
    )
  }

  if (!chromeAIReady) {
    const instructions = getSetupInstructions()
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 transition-all duration-300 ease-out" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <AlertCircle className="w-6 h-6 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h2 className="text-lg font-medium mb-2 transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
            Chrome AI Not Available
          </h2>
          <p className="text-sm mb-4 transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>
            {chromeAIMessage}
          </p>
          <div className="text-xs text-left mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
            {instructions.map((instruction, i) => (
              <div key={i} className="mb-1">{instruction}</div>
            ))}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
            style={{
              backgroundColor: 'var(--chip-bg)',
              color: 'var(--chip-text)'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show content warning if needed
  if (showContentWarning && pendingContent) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ContentWarning
          contentLength={pendingContent.content?.length || 0}
          estimatedTokens={estimateTokens(pendingContent.content || '')}
          pageTitle={pendingContent.title || 'Unknown Page'}
          onProceed={handleContentWarningProceed}
          onCancel={handleContentWarningCancel}
        />
      </div>
    )
  }

  if (isLoadingContent) {
    return (
      <div className="flex flex-col h-screen items-center justify-center transition-all duration-300 ease-out" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin transition-colors duration-200"
            style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }}>
            Loading page content...
          </p>
        </div>
      </div>
    )
  }

  if (!currentSession) {
    // Check if we're on a restricted page
    const isRestrictedUrl = /^(chrome:\/\/|chrome-extension:\/\/|about:|data:|file:\/\/|view-source:)/.test(currentUrl)
    
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 transition-all duration-300 ease-out" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isRestrictedUrl ? (
            <>
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <AlertCircle className="w-6 h-6 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h2 className="text-lg font-medium mb-2 transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
                Restricted Page
              </h2>
              <p className="text-sm mb-4 transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>
                Chrome doesn't allow extensions to access this type of page for security reasons.
              </p>
              <p className="text-xs transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }}>
                Please navigate to a regular webpage (like a news article, blog post, or documentation) to use the chat feature.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm mb-4 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }}>
                Navigate to a webpage to start chatting
              </p>
              <button
                onClick={initializeSession}
                className="px-4 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'var(--chip-bg)',
                  color: 'var(--chip-text)'
                }}
              >
                Retry Loading
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen transition-all ease-out animate-in fade-in slide-in-from-right-4 duration-500" style={{ backgroundColor: 'var(--bg)' }}>
      <SessionHeader
        title={currentSession.title}
        domain={currentSession.domain}
        onRefresh={handleRefresh}
        onClear={handleClearSession}
      />

      <ChatMessages
        messages={currentSession.messages}
        isLoading={isLoadingMessage}
      />

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoadingMessage}
        placeholder="Ask about this article..."
      />

      {shouldShowNewChatButton && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FloatingNewChatButton
            pageTitle={pendingPageTitle}
            onStartNewChat={handleStartNewChat}
            onDismiss={handleDismissNewChat}
          />
        </div>
      )}
    </div>
  )
}

export default SidePanel