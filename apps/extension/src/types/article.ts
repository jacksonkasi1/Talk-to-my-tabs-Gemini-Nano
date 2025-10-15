export interface Article {
  id: string
  title: string
  description: string
  content: string // Markdown content
  url: string
  imageUrl?: string
  isRead: boolean
  savedAt: string | Date
  source: string
  readTime: string
}