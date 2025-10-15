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
      console.log('📄 Requesting page content...')
      const response = await chrome.runtime.sendMessage({ 
        action: 'getActiveTabContent' 
      })
      
      console.log('📄 Content response:', response)
      
      if (response?.success && response.data) {
        console.log('✅ Content loaded successfully!')
        console.log('   - Title:', response.data.title)
        console.log('   - URL:', response.data.url)
        console.log('   - Content length:', response.data.content?.length || 0)
        console.log('   - Content preview:', response.data.content?.substring(0, 200))
        return response.data
      }
      
      // Handle specific error types
      if (response?.error === 'restricted_url') {
        console.warn('⚠️ Restricted URL - cannot access content')
        throw new Error('RESTRICTED_URL')
      }
      
      console.warn('⚠️ No content data in response')
      return null
    } catch (error) {
      console.error('❌ Error loading page content:', error)
      if (error instanceof Error && error.message === 'RESTRICTED_URL') {
        throw error // Re-throw to be handled by caller
      }
      return null
    } finally {
      setLoadingContent(false)
    }
  }, [setLoadingContent])

  const initializeSession = useCallback(async () => {
    console.log('🚀 Initializing chat session...')
    try {
      const content = await loadPageContent()
      if (!content) {
        console.error('❌ Failed to load page content')
        return
      }

    console.log('✅ Content loaded, proceeding with session initialization')
    const domain = getDomainFromUrl(content.url)
    lastCheckedUrl.current = content.url
    
    console.log('🌐 Domain:', domain)
    console.log('📊 Content stats:', {
      hasContent: !!content.content,
      contentLength: content.content?.length || 0,
      estimatedTokens: estimateTokens(content.content || '')
    })

    // Check if content is large and should show warning
    if (shouldShowContentWarning(content)) {
      console.log('⚠️ Content is large, showing warning...')
      setPendingContent(content)
      setShowContentWarning(true)
      return
    }

    // Check if we already have a session for this domain
    if (hasSessionForDomain(domain)) {
      console.log('♻️ Loading existing session for domain:', domain)
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
      console.log('🆕 Creating new session with content:', {
        domain,
        url: content.url,
        title: content.title,
        hasPageContent: !!content,
        contentLength: content.content?.length || 0
      })
      // Create new session
      createSession(domain, content.url, content.title, content)
      setShowNewChatButton(false)
    }
    } catch (error) {
      if (error instanceof Error && error.message === 'RESTRICTED_URL') {
        console.warn('⚠️ Cannot access content from restricted page')
        // Don't clear anything, just skip initialization
        return
      }
      // Re-throw other errors
      throw error
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

    console.log('⚡ Content warning proceed - creating/updating session with content')
    const domain = getDomainFromUrl(pendingContent.url)

    // Check if we already have a session for this domain
    if (hasSessionForDomain(domain)) {
      const existingSession = sessions[domain]
      
      // If same URL, update the existing session with fresh content
      if (existingSession && existingSession.url === pendingContent.url) {
        console.log('🔄 Updating existing session with fresh content')
        updateSession(domain, {
          pageContent: pendingContent,
          title: pendingContent.title
        })
        loadSession(domain)
      } else {
        // Different URL on same domain - create fresh session
        console.log('🆕 Creating new session (different URL, same domain)')
        createSession(domain, pendingContent.url, pendingContent.title, pendingContent)
      }
    } else {
      console.log('🆕 Creating new session (new domain)')
      createSession(domain, pendingContent.url, pendingContent.title, pendingContent)
    }

    setShowContentWarning(false)
    setPendingContent(null)
  }, [pendingContent, getDomainFromUrl, hasSessionForDomain, loadSession, sessions, updateSession, createSession, setShowContentWarning, setPendingContent])

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