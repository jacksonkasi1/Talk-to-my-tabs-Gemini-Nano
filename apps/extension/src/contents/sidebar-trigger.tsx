// apps/extension/src/contents/sidebar-trigger.tsx
// ** import types
import type { PlasmoCSConfig } from "plasmo"

// ** import core packages
import React, { useState, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { MessageCircle, Bookmark, Check, X, Loader } from "lucide-react"

// ** import styles
import "@/styles/content-style.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle"
}

// Global flag to prevent multiple injections
let isInjected = false
let globalRoot: any = null // Store root reference

const FloatingButton = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ bottom: 80, right: 24 })
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isExtensionInvalid, setIsExtensionInvalid] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0, startBottom: 0, startRight: 0 })
  const dragThreshold = useRef(5) // 5px minimum movement to start drag
  
  // Hide button on restricted pages
  const isRestrictedPage = /^(chrome:\/\/|chrome-extension:\/\/|about:|data:|file:\/\/|view-source:)/.test(window.location.href)
  
  // Check extension validity periodically
  useEffect(() => {
    const checkExtensionValidity = () => {
      if (!chrome.runtime?.id) {
        setIsExtensionInvalid(true)
      }
    }
    
    // Check every 2 seconds
    const interval = setInterval(checkExtensionValidity, 2000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Apply theme to root element
    const rootElement = document.querySelector("#talktomytabs-root")
    if (rootElement) {
      rootElement.setAttribute("data-theme", theme)
    }
  }, [theme])

  useEffect(() => {
    // Get initial theme from localStorage first (faster)
    const localTheme = localStorage.getItem("theme") as "light" | "dark" | null
    if (localTheme) {
      setTheme(localTheme)
    }

    // Then check chrome.storage
    chrome.storage?.local.get(['theme'], (result) => {
      if (result.theme) {
        setTheme(result.theme as "light" | "dark")
      }
    })

    // Listen for localStorage changes (for same-origin updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue as "light" | "dark")
      }
    }

    // Listen for chrome.storage changes (for cross-origin updates)
    const handleChromeStorageChange = (changes: any) => {
      if (changes.theme) {
        setTheme(changes.theme.newValue as "light" | "dark")
      }
    }

    window.addEventListener("storage", handleStorageChange)
    chrome.storage?.onChanged.addListener(handleChromeStorageChange)

    // Also check periodically as fallback
    const interval = setInterval(() => {
      const currentTheme = localStorage.getItem("theme") as "light" | "dark" | null
      if (currentTheme && currentTheme !== theme) {
        setTheme(currentTheme)
      }
    }, 1000)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      chrome.storage?.onChanged.removeListener(handleChromeStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    // Listen for sidebar state changes
    const handleMessage = (message: any) => {
      if (message.action === 'sidebarOpened') {
        setIsHidden(true)
        setIsExpanded(false)
      } else if (message.action === 'sidebarClosed') {
        setIsHidden(false)
      }
    }

    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
      return () => chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return

    e.preventDefault()

    // Start tracking potential drag
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startBottom: position.bottom,
      startRight: position.right
    }
  }

  const handleChatMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Use mousedown to preserve user gesture for Chrome 127+
    handleOpenSidebar()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = dragStartPos.current.x - e.clientX
      const deltaY = e.clientY - dragStartPos.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Only start actual dragging if moved more than threshold
      if (distance > dragThreshold.current) {
        setPosition({
          right: Math.max(24, Math.min(window.innerWidth - 80, dragStartPos.current.startRight + deltaX)),
          bottom: Math.max(24, Math.min(window.innerHeight - 80, dragStartPos.current.startBottom - deltaY))
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const handleOpenSidebar = () => {
    setIsExpanded(false)

    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        alert('Extension was updated. Please reload this page to use TalkToMyTabs.')
        return
      }

      // Direct approach - mousedown should preserve user gesture better
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError)
          alert('Extension connection lost. Please reload this page.')
          return
        }
        
        if (response?.success) {
          chrome.runtime.sendMessage({ action: 'sidebarOpened' })
        } else {
          console.error('Failed to open side panel:', response?.error)
        }
      })
    } catch (error) {
      console.error('Error opening sidebar:', error)
      alert('Extension error. Please reload this page.')
    }
  }

  const handleSaveArticle = async () => {
    setIsSaving(true)
    
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        alert('Extension was updated. Please reload this page to use TalkToMyTabs.')
        setIsSaving(false)
        return
      }

      const response = await chrome.runtime.sendMessage({
        action: 'saveArticle'
      })
      
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError)
        alert('Extension connection lost. Please reload this page.')
        setIsSaving(false)
        return
      }
      
      if (response?.success) {
        setShowSuccess(true)
        setIsExpanded(false)
        setTimeout(() => setShowSuccess(false), 2000)
      } else {
        console.error('Failed to save article:', response?.error)
        alert(`Failed to save article: ${response?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving article:', error)
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        alert('Extension was updated. Please reload this page to use TalkToMyTabs.')
      } else {
        alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Don't show on restricted pages or when hidden
  if (isRestrictedPage || isHidden) return null

  // Show reload message if extension is invalid
  if (isExtensionInvalid) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 2147483647,
          backgroundColor: '#ff6b6b',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          maxWidth: '300px',
          cursor: 'pointer'
        }}
        onClick={() => window.location.reload()}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Extension Updated</div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>Click here to reload the page</div>
      </div>
    )
  }

  return (
    <div
      ref={buttonRef}
      className={`talktomytabs-floating ${isDragging ? 'dragging' : ''}`}
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        position: 'fixed',
        zIndex: 2147483647
      }}
    >
      {showSuccess ? (
        <div className="success-pill">
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </div>
      ) : isExpanded ? (
        <div className="expanded-group">
          <button
            onMouseDown={handleChatMouseDown}
            className="action-btn"
            title="Open AI Chat"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveArticle}
            className="action-btn"
            title="Save Article"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setIsExpanded(false)}
            className="action-btn close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          onMouseDown={handleMouseDown}
          className="main-btn"
          title="TalkToMyTabs"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Mount the component - with strict duplicate prevention
const mountFloatingButton = () => {
  // Prevent multiple injections using global flag
  if (isInjected) {
    console.log("TalkToMyTabs already injected via global flag")
    return
  }

  // Clean up any existing instances first
  const existingRoots = document.querySelectorAll("#talktomytabs-root")
  existingRoots.forEach(root => root.remove())

  // Create and mount new instance
  const container = document.createElement("div")
  container.id = "talktomytabs-root"
  container.setAttribute("data-talktomytabs", "true")

  // Set initial theme
  const initialTheme = localStorage.getItem("theme") || "light"
  container.setAttribute("data-theme", initialTheme)

  document.body.appendChild(container)

  const root = createRoot(container)
  globalRoot = root
  root.render(<FloatingButton />)

  // Set global flag
  isInjected = true

  // Also set a marker on window object
  ;(window as any).__talktomytabs_injected = true
}

// Initialize only once with multiple checks
if (typeof window !== 'undefined') {
  // Check if already injected via window marker
  if ((window as any).__talktomytabs_injected) {
    console.log("TalkToMyTabs already injected via window marker")
  } else if (document.querySelector('[data-talktomytabs="true"]')) {
    console.log("TalkToMyTabs already injected via DOM marker")
    isInjected = true
    ;(window as any).__talktomytabs_injected = true
  } else {
    // Safe to inject
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountFloatingButton, { once: true })
    } else {
      mountFloatingButton()
    }
  }
}

// Prevent default export from creating duplicates
// Export as named export instead
export { FloatingButton }