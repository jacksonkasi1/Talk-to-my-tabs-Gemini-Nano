// apps/extension/src/hooks/useChatSession.ts
// ** import types
import type { PageContent } from '@/utils/contentExtractor'

// ** import core packages
import { useEffect, useCallback, useRef } from 'react'

// ** import utils
import { useChatStore } from '@/store/chatStore'
import { extractPageContent } from '@/logic/contentExtractor'

export const useChatSession = () => {
  const {
    currentDomain,
    currentSession,
    sessions,
    isLoadingContent,
    showNewChatButton,
    showContentWarning,
    pendingContent,
    setCurrentDomain,
    createSession,
    loadSession,
    setLoadingContent,
    setShowNewChatButton,
    setShowContentWarning,
    setPendingContent,
    hasSessionForDomain,
    clearCurrentSession,
    updateSession
  } = useChatStore()

  const lastCheckedUrl = useRef<string>('')
  const isCheckingRef = useRef<boolean>(false)

  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return url
    }
  }

  // Estimate token usage (rough approximation: 1 token ≈ 4 characters)
  const estimateTokens = (content: string): number => {
    return Math.ceil(content.length / 4)
  }

  // Check if content is large and should trigger warning
  const shouldShowContentWarning = (content: PageContent): boolean => {
    const contentLength = content.content?.length || 0
    const estimatedTokens = estimateTokens(content.content || '')
    // Show warning if content is larger than 4000 characters (~1000 tokens)
    return contentLength > 4000 || estimatedTokens > 1000
  }

  const loadPageContent = useCallback(async (): Promise<PageContent | null> => {
    setLoadingContent(true)
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getActiveTabContent' 
      })
      
      if (response?.success && response.data) {
        return response.data
      }
      return null
    } catch (error) {
      console.error('Error loading page content:', error)
      return null
    } finally {
      setLoadingContent(false)
    }
  }, [setLoadingContent])

  const initializeSession = useCallback(async () => {
    const content = await loadPageContent()
    if (!content) {
      console.error('Failed to load page content')
      return
    }

    const domain = getDomainFromUrl(content.url)
    lastCheckedUrl.current = content.url

    // Check if content is large and should show warning
    if (shouldShowContentWarning(content)) {
      setPendingContent(content)
      setShowContentWarning(true)
      return
    }

    // Check if we already have a session for this domain
    if (hasSessionForDomain(domain)) {
      // Load existing session
      loadSession(domain)

      // Check if URL changed within the same domain
      const existingSession = sessions[domain]
      if (existingSession && existingSession.url !== content.url) {
        // Only show new chat button if we're not already showing it
        if (!showNewChatButton) {
          setShowNewChatButton(true)
        }
      } else {
        // Same URL, hide the button
        setShowNewChatButton(false)
      }
    } else {
      // Create new session
      createSession(domain, content.url, content.title, content)
      setShowNewChatButton(false)
    }
  }, [loadPageContent, hasSessionForDomain, loadSession, createSession, sessions, setShowNewChatButton, showNewChatButton, shouldShowContentWarning, setPendingContent, setShowContentWarning])

  const startNewChat = useCallback(async () => {
    const content = await loadPageContent()
    if (!content) return

    const domain = getDomainFromUrl(content.url)
    lastCheckedUrl.current = content.url
    
    // Update the existing session with new content
    if (hasSessionForDomain(domain)) {
      // Update session with new URL and content
      updateSession(domain, {
        url: content.url,
        title: content.title,
        pageContent: content,
        messages: [
          {
            id: `welcome-${Date.now()}`,
            text: `I'm ready to help you with "${content.title}". What would you like to know about this article?`,
            isUser: false,
            timestamp: new Date()
          }
        ]
      })
    } else {
      createSession(domain, content.url, content.title, content)
    }
    
    setShowNewChatButton(false)
  }, [loadPageContent, createSession, hasSessionForDomain, updateSession, setShowNewChatButton])

  const checkForTabChange = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!activeTab?.url) {
        isCheckingRef.current = false
        return
      }

      const domain = getDomainFromUrl(activeTab.url)
      
      // Skip if we're checking the same URL and domain
      if (activeTab.url === lastCheckedUrl.current && currentDomain === domain) {
        isCheckingRef.current = false
        return
      }

      console.log('Tab changed from', lastCheckedUrl.current, 'to', activeTab.url)
      lastCheckedUrl.current = activeTab.url

      // Domain changed
      if (domain !== currentDomain) {
        if (hasSessionForDomain(domain)) {
          // Switch to existing session for this domain
          loadSession(domain)
          
          // Check if the URL is different
          const existingSession = sessions[domain]
          if (existingSession && existingSession.url !== activeTab.url) {
            setShowNewChatButton(true)
          } else {
            setShowNewChatButton(false)
          }
        } else {
          // No session for this domain
          clearCurrentSession()
          // Initialize new session automatically
          await initializeSession()
        }
      } else if (currentSession && activeTab.url !== currentSession.url) {
        // Same domain but different URL
        setShowNewChatButton(true)
      } else {
        // Same domain and URL
        setShowNewChatButton(false)
      }
    } catch (error) {
      console.error('Error checking for tab change:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [currentDomain, currentSession, hasSessionForDomain, loadSession, setShowNewChatButton, clearCurrentSession, sessions, initializeSession])

  // Auto-check for tab changes periodically (reduced frequency)
  useEffect(() => {
    // Check immediately
    checkForTabChange()

    // Set up interval to check periodically (fallback for missed events)
    const intervalId = setInterval(checkForTabChange, 2000) // Increased to 2 seconds

    return () => clearInterval(intervalId)
  }, [checkForTabChange])

  // Handle content warning actions
  const handleContentWarningProceed = useCallback(() => {
    if (!pendingContent) return

    const domain = getDomainFromUrl(pendingContent.url)

    // Check if we already have a session for this domain
    if (hasSessionForDomain(domain)) {
      loadSession(domain)
      const existingSession = sessions[domain]
      if (existingSession && existingSession.url !== pendingContent.url) {
        setShowNewChatButton(true)
      }
    } else {
      createSession(domain, pendingContent.url, pendingContent.title, pendingContent)
    }

    setShowContentWarning(false)
    setPendingContent(null)
  }, [pendingContent, getDomainFromUrl, hasSessionForDomain, loadSession, sessions, setShowNewChatButton, createSession, setShowContentWarning, setPendingContent])

  const handleContentWarningCancel = useCallback(() => {
    setShowContentWarning(false)
    setPendingContent(null)
    // Close the sidepanel when user cancels
    window.close()
  }, [setShowContentWarning, setPendingContent])

  return {
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
  }
}