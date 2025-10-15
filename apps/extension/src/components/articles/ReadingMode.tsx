// apps/extension/src/components/articles/ReadingMode.tsx

// ** import types
import type { FC } from "react"
import type { Article } from "@/types/article"

// ** import core packages
import React, { useEffect, useState, useMemo } from "react"
import { ArrowLeft, ArrowRight, Home, ExternalLink, Calendar, Clock, User } from "lucide-react"
import MarkdownIt from "markdown-it"

interface ReadingModeProps {
  article: Article
  nextArticle: Article | null
  previousArticle: Article | null
  onClose: () => void
  onMarkAsDone: (articleId: string) => void
  onNavigateNext: (article: Article) => void
  onNavigatePrevious: (article: Article) => void
}

const ReadingMode: FC<ReadingModeProps> = ({
  article,
  nextArticle,
  previousArticle,
  onClose,
  onMarkAsDone,
  onNavigateNext,
  onNavigatePrevious
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Initialize markdown-it with options for beautiful rendering
  const md: any = useMemo(() => {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: false,
      highlight: function (str, lang) {
        // Simple code block styling without external highlighter
        if (lang) {
          return `<pre class="language-${lang}"><code class="language-${lang}">${md.utils.escapeHtml(str)}</code></pre>`
        }
        return `<pre><code>${md.utils.escapeHtml(str)}</code></pre>`
      }
    })
  }, [])

  // Parse markdown content
  const renderedContent = useMemo(() => {
    return md.render(article.content)
  }, [article.content, md])

  // Parse markdown description
  const renderedDescription = useMemo(() => {
    return article.description ? md.render(article.description) : ''
  }, [article.description, md])
  
  useEffect(() => {
    setIsVisible(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [article])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if button would be enabled
      if (e.key === 'ArrowRight' && (nextArticle || !article.isRead)) {
        handleMarkAndNext()
      } else if (e.key === 'ArrowLeft' && previousArticle) {
        handleNavigatePrevious()
      } else if (e.key === 'o') {
        handleOpenOriginal()
      } else if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [article, nextArticle, previousArticle])

  const handleMarkAndNext = () => {
    if (!article.isRead) {
      onMarkAsDone(article.id)
    }
    
    if (nextArticle) {
      setIsTransitioning(true)
      setTimeout(() => {
        onNavigateNext(nextArticle)
        setIsTransitioning(false)
      }, 200)
    } else {
      handleClose()
    }
  }

  const handleNavigatePrevious = () => {
    if (previousArticle) {
      setIsTransitioning(true)
      setTimeout(() => {
        onNavigatePrevious(previousArticle)
        setIsTransitioning(false)
      }, 200)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 200)
  }

  const handleOpenOriginal = () => {
    if (article.url) {
      window.open(article.url, '_blank')
    }
  }

  // Determine if the right button should be disabled
  const isRightButtonDisabled = !nextArticle && article.isRead

  return (
    <div 
      className={`min-h-screen transition-all duration-200 ${isVisible && !isTransitioning ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <article className="pb-24">
        <div className="reading-container">
          {/* Hero Image */}
          {article.imageUrl && (
            <div className="article-hero">
              <img
                src={article.imageUrl}
                alt=""
                className="article-hero-image"
              />
            </div>
          )}

          {/* Article Header */}
          <header className="article-header">
            <h1 className="article-title">
              {article.title}
            </h1>
            
            {article.description && (
              <>
                <div
                  className="article-description markdown-content"
                  dangerouslySetInnerHTML={{ __html: renderedDescription }}
                />
                <hr className="divider" />
              </>
            )}

            {/* Article Meta */}
            <div className="article-meta">
              <div className="article-meta-item">
                <User className="w-3.5 h-3.5" />
                <span>{article.source}</span>
              </div>
              <div className="article-meta-item">
                <Calendar className="w-3.5 h-3.5" />
                <time>{new Date(article.savedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</time>
              </div>
              <div className="article-meta-item">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTime}</span>
              </div>
            </div>
            <hr className="divider" />
          </header>

          {/* Markdown Content */}
          <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />

          {/* Article Footer */}
          <div className="article-footer">
            <div className="article-end-mark">
              <span>◆</span>
            </div>
          </div>
        </div>
      </article>

      {/* Floating chip for full article */}
      {article.url && (
        <button
          onClick={handleOpenOriginal}
          className="fixed bottom-20 right-6 px-3 py-1.5 chip text-xs flex items-center gap-1.5 shadow-sm"
          title="Open full article (O)"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Full article</span>
        </button>
      )}

      {/* Navigation Bar */}
      <div 
        className="reading-navbar"
        style={{ 
          backgroundColor: 'var(--bg)',
          borderTop: '1px solid var(--divider)'
        }}
      >
        <div className="reading-navbar-content">
          <button
            onClick={handleClose}
            className="icon-btn w-10 h-10"
            title="Back to list (Esc)"
          >
            <Home className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNavigatePrevious}
              disabled={!previousArticle}
              className={`
                icon-btn w-8 h-8
                ${previousArticle 
                  ? 'cursor-pointer' 
                  : 'opacity-30 cursor-not-allowed'
                }
              `}
              title="Previous article (←)"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>

            <span className="px-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {nextArticle ? 'More to read' : article.isRead ? 'Last article' : 'Mark as read'}
            </span>

            <button
              onClick={handleMarkAndNext}
              disabled={isRightButtonDisabled}
              className={`
                w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200
                ${!isRightButtonDisabled
                  ? 'chip cursor-pointer' 
                  : 'opacity-30 cursor-not-allowed'
                }
              `}
              style={{
                backgroundColor: isRightButtonDisabled ? 'var(--chip-secondary-bg)' : undefined
              }}
              title={
                isRightButtonDisabled 
                  ? "No more articles" 
                  : nextArticle 
                    ? "Mark done & next (→)" 
                    : "Mark done & close"
              }
            >
              <ArrowRight 
                className="w-4 h-4" 
                style={{ 
                  color: isRightButtonDisabled ? 'var(--text-tertiary)' : undefined 
                }} 
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReadingMode