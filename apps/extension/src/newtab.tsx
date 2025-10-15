// apps/extension/src/newtab.tsx
// ** import types
import type { FC } from "react"
import type { Article } from "@/types/article"

// ** import core packages
import { useState, useEffect, useRef } from "react"
import { Search, Loader2, Settings as SettingsIcon } from "lucide-react"

// ** import utils
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { deleteArticleFromStorage } from "@/utils/articleStorage"

// ** import components
import ArticleCard from "@/components/articles/ArticleCard"
import ReadingMode from "@/components/articles/ReadingMode"
import KeyboardShortcuts from "@/components/ui/KeyboardShortcuts"
import SearchBar from "@/components/ui/SearchBar"
import ThemeToggle from "@/components/ui/ThemeToggle"
import Settings from "@/components/settings/Settings"

// ** import styles
import "@/styles/style.css"
import "@/styles/markdown.css"

const NewTab: FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light"
  })
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread")
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoadingArticles, setIsLoadingArticles] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [readingModeArticle, setReadingModeArticle] = useState<Article | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tabWidths, setTabWidths] = useState({ unread: 0, read: 0 })
  const [tabPositions, setTabPositions] = useState({ unread: 0, read: 0 })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const tabRefs = {
    unread: useRef<HTMLButtonElement>(null),
    read: useRef<HTMLButtonElement>(null)
  }

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light")
  }

  // Apply theme to document and storage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)

    //  Save to chrome.storage for content scripts
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ theme })
    }
  }, [theme])

  // Load articles from Chrome storage
  useEffect(() => {
    const loadArticles = () => {
      chrome.storage.local.get(['articles'], (result) => {
        if (result.articles) {
          // Articles already have savedAt as ISO string, no need to convert
          setArticles(result.articles)
        }
        setIsLoadingArticles(false)
      })
    }

    loadArticles()

    // Listen for storage changes
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes.articles) {
        const updatedArticles = changes.articles.newValue || []
        setArticles(updatedArticles)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.source.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === "unread" ? !article.isRead : article.isRead

    return matchesSearch && matchesTab
  })

  const unreadCount = articles.filter(a => !a.isRead).length
  const readCount = articles.filter(a => a.isRead).length

  useEffect(() => {
    const measureTabs = () => {
      const unreadTab = tabRefs.unread.current
      const readTab = tabRefs.read.current

      if (unreadTab && readTab) {
        setTabWidths({
          unread: unreadTab.offsetWidth,
          read: readTab.offsetWidth
        })
        setTabPositions({
          unread: unreadTab.offsetLeft,
          read: readTab.offsetLeft
        })
      }
    }

    measureTabs()
    window.addEventListener('resize', measureTabs)
    return () => window.removeEventListener('resize', measureTabs)
  }, [unreadCount, readCount])

  useKeyboardShortcuts({
    searchInputRef,
    showHelp,
    onToggleHelp: () => setShowHelp(!showHelp)
  })

  const handleMarkAsDone = (articleId: string) => {
    const updatedArticles = articles.map(article =>
      article.id === articleId ? { ...article, isRead: true } : article
    )
    setArticles(updatedArticles)
    
    // Save to Chrome storage
    chrome.storage.local.set({ articles: updatedArticles })
  }

  const handleDeleteArticle = async (articleId: string) => {
    try {
      // Remove from local state with animation
      setIsTransitioning(true)
      
      setTimeout(async () => {
        const updatedArticles = articles.filter(article => article.id !== articleId)
        setArticles(updatedArticles)
        
        // Save to Chrome storage
        await deleteArticleFromStorage(articleId)
        
        setIsTransitioning(false)
      }, 150)
    } catch (error) {
      console.error('Error deleting article:', error)
      setIsTransitioning(false)
    }
  }

  const handleOpenReading = (article: Article) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setReadingModeArticle(article)
      setIsTransitioning(false)
    }, 150)
  }

  const handleCloseReading = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setReadingModeArticle(null)
      setIsTransitioning(false)
    }, 150)
  }

  const handleTabChange = (tab: "unread" | "read") => {
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTransitioning(false)
    }, 100)
  }

  const getNextArticle = (currentId: string): Article | null => {
    const currentIndex = filteredArticles.findIndex(a => a.id === currentId)
    return filteredArticles[currentIndex + 1] || null
  }

  const getPreviousArticle = (currentId: string): Article | null => {
    const currentIndex = filteredArticles.findIndex(a => a.id === currentId)
    return filteredArticles[currentIndex - 1] || null
  }

  if (readingModeArticle) {
    return (
      <>
        <ReadingMode
          article={readingModeArticle}
          nextArticle={getNextArticle(readingModeArticle.id)}
          previousArticle={getPreviousArticle(readingModeArticle.id)}
          onClose={handleCloseReading}
          onMarkAsDone={handleMarkAsDone}
          onNavigateNext={(nextArticle) => {
            setReadingModeArticle(nextArticle)
          }}
          onNavigatePrevious={(prevArticle) => {
            setReadingModeArticle(prevArticle)
          }}
        />
        <ThemeToggle theme={theme} onToggleTheme={toggleTheme} bottom="140px" />
      </>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="mb-8">
          <div className="mb-8">
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              isFocused={searchFocused}
              placeholder="Search articles..."
            />
          </div>

          <div className="relative">
            <div className="flex gap-8 text-sm">
              <button
                ref={tabRefs.unread}
                onClick={() => handleTabChange("unread")}
                className="relative pb-2 transition-all duration-300"
                style={{
                  color: activeTab === "unread" ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: activeTab === "unread" ? '500' : '400'
                }}
              >
                Unread
                {unreadCount > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 text-xs rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: activeTab === "unread" ? 'var(--chip-bg)' : 'var(--chip-secondary-bg)',
                      color: activeTab === "unread" ? 'var(--chip-text)' : 'var(--chip-secondary-text)'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                ref={tabRefs.read}
                onClick={() => handleTabChange("read")}
                className="relative pb-2 transition-all duration-300"
                style={{
                  color: activeTab === "read" ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: activeTab === "read" ? '500' : '400'
                }}
              >
                Read
                {readCount > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 text-xs rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: activeTab === "read" ? 'var(--chip-bg)' : 'var(--chip-secondary-bg)',
                      color: activeTab === "read" ? 'var(--chip-text)' : 'var(--chip-secondary-text)'
                    }}
                  >
                    {readCount}
                  </span>
                )}
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 divider">
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  width: `${activeTab === "unread" ? tabWidths.unread : tabWidths.read}px`,
                  transform: `translateX(${activeTab === "unread" ? tabPositions.unread : tabPositions.read}px)`
                }}
              />
            </div>
          </div>
        </header>

        <main className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {isLoadingArticles ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Loading articles...
              </p>
            </div>
          ) : filteredArticles.length > 0 ? (
            <div>
              {filteredArticles.map((article, index) => (
                <div key={article.id}>
                  {index > 0 && (
                    <div
                      className="divider mx-2 opacity-50"
                      style={{ backgroundColor: 'var(--divider)' }}
                    />
                  )}
                  <div
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <ArticleCard
                      article={article}
                      onOpenReading={handleOpenReading}
                      onMarkAsDone={handleMarkAsDone}
                      onDelete={handleDeleteArticle}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 animate-fadeIn">
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <Search className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? "No articles found" : `No ${activeTab} articles`}
              </p>
              {!searchQuery && activeTab === "unread" && unreadCount === 0 && articles.length === 0 && (
                <div className="text-xs space-y-2" style={{ color: 'var(--text-tertiary)' }}>
                  <p>Visit any webpage and click the floating button to save it for later reading.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      <ThemeToggle theme={theme} onToggleTheme={toggleTheme} />

      {/* Floating Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-20 right-6 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--divider)',
          color: 'var(--text-primary)',
          zIndex: 40
        }}
        title="Settings"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      <KeyboardShortcuts
        showHelp={showHelp}
        onToggleHelp={() => setShowHelp(!showHelp)}
      />

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default NewTab