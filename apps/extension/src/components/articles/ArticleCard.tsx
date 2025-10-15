// apps/extension/src/components/articles/ArticleCard.tsx
// ** import types
import type { FC } from "react"
import type { Article } from "@/types/article"

// ** import core packages
import React, { useState } from "react"
import { Check, Trash2, Image } from "lucide-react"

// ** import sounds
import { DRAG_TO_TRASH_SOUND, MARK_AS_DONE_SOUND } from "@/constants/sounds"

interface ArticleCardProps {
  article: Article
  onOpenReading: (article: Article) => void
  onMarkAsDone?: (articleId: string) => void
  onDelete?: (articleId: string) => void
}

const ArticleCard: FC<ArticleCardProps> = ({
  article,
  onOpenReading,
  onMarkAsDone,
  onDelete
}) => {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleteHovered, setIsDeleteHovered] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const formatDate = (dateValue: string | Date) => {
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Recently'
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date)
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Recently'
    }
  }

  const playDeleteSound = async () => {
    try {
      const audio = new Audio(DRAG_TO_TRASH_SOUND)
      audio.volume = 0.3
      await audio.play()
    } catch (error) {
      // Silently fail if audio doesn't play
      console.log('Audio playback failed:', error)
    }
  }

  const playMarkAsDoneSound = async () => {
    try {
      const audio = new Audio(MARK_AS_DONE_SOUND)
      audio.volume = 0.3
      await audio.play()
    } catch (error) {
      // Silently fail if audio doesn't play
      console.log('Audio playback failed:', error)
    }
  }

  const handleMarkAsDone = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Play mark as done sound
    await playMarkAsDoneSound()

    onMarkAsDone?.(article.id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Play deletion sound
    await playDeleteSound()
    
    onDelete?.(article.id)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  return (
    <div 
      className="py-4 px-2 -mx-2 cursor-pointer rounded-lg transition-colors duration-200"
      style={{
        backgroundColor: isHovered ? 'var(--bg-hover-subtle)' : 'transparent'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenReading(article)}
    >
      <div className="flex gap-4">
        {/* Checkbox or Delete button */}
        <div className="w-5 h-5 mt-0.5">
          {!article.isRead ? (
            <button
              onClick={handleMarkAsDone}
              className="w-5 h-5 rounded-full border transition-opacity duration-200"
              style={{
                borderColor: 'var(--text-tertiary)',
                backgroundColor: 'transparent',
                opacity: isHovered ? 0.7 : 0.3
              }}
            >
              <Check 
                className="w-3 h-3"
                style={{ 
                  margin: 'auto',
                  color: 'var(--text-tertiary)',
                  display: 'none'
                }}
              />
            </button>
          ) : (
            <button
              onClick={handleDelete}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              className="w-5 h-5 flex items-center justify-center rounded transition-all duration-200"
              style={{
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'auto' : 'none',
                color: isDeleteHovered ? '#ef4444' : 'var(--text-tertiary)'
              }}
              title="Delete article"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Text */}
        <div className="flex-1">
          <h3 
            className="text-sm font-medium mb-1 transition-colors duration-200"
            style={{ 
              color: article.isRead 
                ? 'var(--text-tertiary)' 
                : isHovered ? 'var(--text-primary)' : 'var(--text-primary)'
            }}
          >
            {article.title}
          </h3>
          
          <p 
            className="text-xs mb-2 line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {article.description || article.content.substring(0, 150)}
          </p>
          
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>{article.source}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatDate(article.savedAt)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{article.readTime}</span>
          </div>
        </div>

        {/* Image */}
        {article.imageUrl && !imageError && (
          <div 
            className="relative w-20 h-20 flex-shrink-0 rounded overflow-hidden"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image className="w-6 h-6" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              </div>
            )}
            <img 
              src={article.imageUrl}
              alt=""
              className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticleCard