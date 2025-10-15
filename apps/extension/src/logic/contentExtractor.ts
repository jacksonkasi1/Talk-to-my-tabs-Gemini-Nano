// apps/extension/src/logic/contentExtractor.ts
// ** import types
import type { PageContent } from '@/utils/contentExtractor'

export const extractPageContent = async (): Promise<PageContent | null> => {
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'getActiveTabContent' 
    })
    
    if (response?.success && response.data) {
      return response.data
    }
    return null
  } catch (error) {
    console.error('Error extracting page content:', error)
    return null
  }
}

export const injectContentExtractor = async (tabId: number): Promise<PageContent | null> => {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const cleanTextContent = (text: string): string => {
          return text
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        }

        const findSuitableBannerImage = (): string => {
          // First try OG and Twitter images
          const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
          if (ogImage) return ogImage
          
          const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || ''
          if (twitterImage) return twitterImage

          // Find all images in the content area first
          const contentSelectors = [
            'main article img',
            'article img',
            'main img',
            '[role="main"] img',
            '.post-content img',
            '.entry-content img',
            '.article-content img',
            '.content-body img',
            '.story-body img',
            '.main-content img',
            '#main-content img',
            '.content img',
            '#content img'
          ]

          for (const selector of contentSelectors) {
            const images = document.querySelectorAll(selector)
            for (const img of images) {
              const imgElement = img as HTMLImageElement
              
              // Check if image is suitable
              if (isImageSuitable(imgElement)) {
                return getImageUrl(imgElement)
              }
            }
          }

          // If no suitable content images, check all images on page
          const allImages = document.querySelectorAll('img')
          for (const img of allImages) {
            const imgElement = img as HTMLImageElement
            if (isImageSuitable(imgElement)) {
              return getImageUrl(imgElement)
            }
          }

          return ''
        }

        const isImageSuitable = (img: HTMLImageElement): boolean => {
          // Skip if no src
          if (!img.src && !img.dataset.src && !img.dataset.lazySrc) return false
          
          // Skip tracking pixels and tiny images
          const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0')
          const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0')
          
          // Minimum dimensions for a banner image
          if (width < 400 || height < 200) return false
          
          // Skip images with aspect ratio too extreme (too tall or too wide)
          const aspectRatio = width / height
          if (aspectRatio < 0.5 || aspectRatio > 4) return false
          
          // Skip common non-content images
          const src = img.src || img.dataset.src || ''
          const bannedPatterns = [
            /avatar/i,
            /profile/i,
            /logo/i,
            /icon/i,
            /button/i,
            /pixel/i,
            /tracking/i,
            /analytics/i,
            /advertisement/i,
            /sponsor/i,
            /badge/i,
            /emoji/i,
            /gif$/i
          ]
          
          for (const pattern of bannedPatterns) {
            if (pattern.test(src) || pattern.test(img.className) || pattern.test(img.alt || '')) {
              return false
            }
          }
          
          return true
        }

        const getImageUrl = (img: HTMLImageElement): string => {
          // Try different image attributes
          let url = img.src || img.dataset.src || img.dataset.lazySrc || img.dataset.original || ''
          
          // Handle relative URLs
          if (url && !url.startsWith('http')) {
            try {
              url = new URL(url, window.location.href).href
            } catch {
              return ''
            }
          }
          
          // Check if URL is valid
          try {
            new URL(url)
            return url
          } catch {
            return ''
          }
        }

        const title = document.title || 'Untitled Page'
        const url = window.location.href
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                          document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
        const imageUrl = findSuitableBannerImage()
        const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || 
                      document.querySelector('meta[property="article:author"]')?.getAttribute('content') || 
                      document.querySelector('[rel="author"]')?.textContent?.trim() || ''
        const publishedDate = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || 
                             document.querySelector('time[datetime]')?.getAttribute('datetime') || ''
        
        let content = ''
        const contentSelectors = [
          'main article',
          'article',
          'main',
          '[role="main"]',
          '.post-content',
          '.entry-content',
          '.article-content',
          '.content-body',
          '.story-body',
          '.main-content',
          '#main-content',
          '.content',
          '#content',
          '.section-content',
          'section.meteredContent',
          'div[data-testid="post-content"]',
          '.container article',
          '.wrapper article',
          '.post',
          '.blog-post',
          '.article-body',
          '.page-content'
        ]
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector)
          if (element) {
            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement
                  if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT')) {
                    return NodeFilter.FILTER_REJECT
                  }
                  return NodeFilter.FILTER_ACCEPT
                }
              }
            )
            
            const textNodes = []
            let node
            while (node = walker.nextNode()) {
              const text = node.textContent?.trim()
              if (text && text.length > 2) {
                textNodes.push(text)
              }
            }
            
            content = textNodes.join(' ')
            if (content.length > 500) break
          }
        }
        
        if (!content || content.length < 500) {
          content = cleanTextContent(document.body.innerText || document.body.textContent || '')
        }
        
        // Limit content to reasonable size
        if (content.length > 15000) {
          content = content.substring(0, 15000) + '...'
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
    })
    
    if (results && results[0]?.result) {
      return results[0].result as PageContent
    }
    return null
  } catch (error) {
    console.error('Error injecting content extractor:', error)
    return null
  }
}