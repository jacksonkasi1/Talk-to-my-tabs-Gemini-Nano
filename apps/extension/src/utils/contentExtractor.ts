// apps/extension/src/utils/contentExtractor.ts
export interface PageContent {
    title: string
    url: string
    content: string
    description?: string
    imageUrl?: string
    author?: string
    publishedDate?: string
  }
  
  export const extractPageContent = (): PageContent => {
    // Extract title
    const title = document.title || 'Untitled Page'
    
    // Extract URL
    const url = window.location.href
    
    // Extract meta description
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                       document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
    
    // Extract main image
    const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                     document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || ''
    
    // Extract author
    const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || ''
    
    // Extract published date
    const publishedDate = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || ''
    
    // Extract main content
    let content = ''
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.post-content',
      '.entry-content',
      '.content',
      '#content'
    ]
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = cleanTextContent(element.textContent || '')
        if (content.length > 500) break // Found substantial content
      }
    }
    
    // Fallback to body content if no main content found
    if (!content || content.length < 500) {
      content = cleanTextContent(document.body.innerText || document.body.textContent || '')
    }
    
    return {
      title,
      url,
      content,
      description,
      imageUrl,
      author,
      publishedDate
    }
  }
  
  const cleanTextContent = (text: string): string => {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim()
  }