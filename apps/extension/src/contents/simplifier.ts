// @ts-nocheck
// apps/extension/src/contents/simplifier.ts
export interface ImagePlaceholder {
  id: string
  src: string
  alt: string
  className: string
  width: string
  height: string
  style: string
}

export interface SimplificationData {
  text: string
  images: ImagePlaceholder[]
}

class ArticleSimplifier {
  private originalContent: HTMLElement | null = null
  private articleElement: Element | null = null
  private resetButton: HTMLElement | null = null
  private imageMap: Map<string, ImagePlaceholder> = new Map()
  private isSimplified: boolean = false

  findArticleElement(): Element | null {
    const selectors = [
      'main article',
      'article[role="article"]',
      'article',
      'main [role="main"]',
      'main',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.article-body',
      '.content-body',
      '.story-body',
      '.main-content',
      '#main-content',
      'div[itemprop="articleBody"]',
      '.article__body',
      '.Article__content',
      '.post__content'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        if (text.length > 300) {
          return element
        }
      }
    }

    return null
  }

  extractArticleWithPlaceholders(): SimplificationData {
    if (!this.articleElement) {
      throw new Error('No article element found')
    }

    // Clone the article element
    const cloned = this.articleElement.cloneNode(true) as HTMLElement

    // Find and replace all images
    const images = cloned.querySelectorAll('img')
    const imageData: ImagePlaceholder[] = []

    images.forEach((img, index) => {
      const placeholder = `[[IMG_${index + 1}]]`

      // Get the computed style to preserve positioning
      const computedStyle = window.getComputedStyle(img)
      const relevantStyles = [
        'display', 'float', 'margin', 'padding', 'width', 'height',
        'max-width', 'max-height', 'border', 'border-radius'
      ].filter(prop => computedStyle.getPropertyValue(prop))
       .map(prop => `${prop}: ${computedStyle.getPropertyValue(prop)}`)
       .join('; ')

      const data: ImagePlaceholder = {
        id: placeholder,
        src: img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '',
        alt: img.alt || '',
        className: img.className || '',
        width: img.getAttribute('width') || '',
        height: img.getAttribute('height') || '',
        style: img.getAttribute('style') || relevantStyles
      }

      imageData.push(data)
      this.imageMap.set(placeholder, data)

      // Create a placeholder that maintains the image's position in text flow
      const placeholderSpan = document.createElement('span')
      placeholderSpan.textContent = ` ${placeholder} `
      placeholderSpan.style.display = 'inline'
      img.parentNode?.replaceChild(placeholderSpan, img)
    })

    // Extract text content
    const text = this.extractTextFromElement(cloned)

    return { text, images: imageData }
  }

  extractTextFromElement(element: HTMLElement): string {
    const lines: string[] = []
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) {
          lines.push(text)
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement
        const tagName = elem.tagName.toLowerCase()
        
        // Skip script and style tags
        if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
          return
        }
        
        // Add line breaks for block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tagName)) {
          lines.push('\n\n')
        }
        
        // Process children
        for (const child of Array.from(node.childNodes)) {
          processNode(child)
        }
        
        // Add line break after block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tagName)) {
          lines.push('\n\n')
        }
      }
    }
    
    processNode(element)
    
    return lines.join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  }

  reconstructHTML(simplifiedText: string): string {
    // Store original styles from the article element
    const originalStyles = this.getOriginalStyles()

    // Process the simplified text while preserving structure
    let processedText = simplifiedText

    // Replace image placeholders with actual images
    const imageMatches = processedText.match(/\[\[IMG_\d+\]\]/g)
    if (imageMatches) {
      imageMatches.forEach(placeholder => {
        const imageData = this.imageMap.get(placeholder)
        if (imageData) {
          const imgHtml = `<img src="${imageData.src}" alt="${imageData.alt}"${imageData.className ? ` class="${imageData.className}"` : ''}${imageData.width ? ` width="${imageData.width}"` : ''}${imageData.height ? ` height="${imageData.height}"` : ''}${imageData.style ? ` style="${imageData.style}"` : ''}>`
          processedText = processedText.replace(placeholder, imgHtml)
        }
      })
    }

    // Convert markdown-like formatting to HTML while preserving original structure
    const paragraphs = processedText.split(/\n\n+/)
    let html = ''

    paragraphs.forEach(paragraph => {
      const trimmed = paragraph.trim()
      if (!trimmed) return

      // Check if this paragraph contains an image
      if (trimmed.includes('<img')) {
        // Split on image tags and handle text around them
        const parts = trimmed.split(/(<img[^>]*>)/)
        parts.forEach(part => {
          if (part.startsWith('<img')) {
            html += part + '\n'
          } else if (part.trim()) {
            html += `<p${originalStyles.paragraph}>${this.escapeHtml(part.trim())}</p>\n`
          }
        })
      } else if (trimmed.startsWith('#')) {
        // Handle headings
        const match = trimmed.match(/^(#+)\s+(.+)/)
        if (match) {
          const level = Math.min(match[1].length, 6)
          html += `<h${level}${originalStyles.heading}>${this.escapeHtml(match[2])}</h${level}>\n`
        }
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Handle lists
        const items = trimmed.split('\n').filter((line: string) => line.trim())
        html += `<ul${originalStyles.list}>\n`
        items.forEach((item: string) => {
          const text = item.replace(/^[-*]\s+/, '').trim()
          html += `  <li${originalStyles.listItem}>${this.escapeHtml(text)}</li>\n`
        })
        html += '</ul>\n'
      } else if (trimmed.match(/^\d+\.\s/)) {
        // Handle numbered lists
        const items = trimmed.split('\n').filter((line: string) => line.trim())
        html += `<ol${originalStyles.list}>\n`
        items.forEach((item: string) => {
          const text = item.replace(/^\d+\.\s+/, '').trim()
          html += `  <li${originalStyles.listItem}>${this.escapeHtml(text)}</li>\n`
        })
        html += '</ol>\n'
      } else if (trimmed.startsWith('>')) {
        // Handle blockquotes
        const text = trimmed.substring(1).trim()
        html += `<blockquote${originalStyles.blockquote}>${this.escapeHtml(text)}</blockquote>\n`
      } else {
        // Regular paragraph
        html += `<p${originalStyles.paragraph}>${this.escapeHtml(trimmed)}</p>\n`
      }
    })

    return html
  }

  getOriginalStyles() {
    if (!this.articleElement) return { paragraph: '', heading: '', list: '', listItem: '', blockquote: '' }

    // Extract common styling patterns from original elements
    const originalP = this.articleElement.querySelector('p')
    const originalH = this.articleElement.querySelector('h1, h2, h3, h4, h5, h6')
    const originalUl = this.articleElement.querySelector('ul')
    const originalLi = this.articleElement.querySelector('li')
    const originalBq = this.articleElement.querySelector('blockquote')

    return {
      paragraph: originalP ? ` class="${originalP.className}" style="${originalP.getAttribute('style') || ''}"` : '',
      heading: originalH ? ` class="${originalH.className}" style="${originalH.getAttribute('style') || ''}"` : '',
      list: originalUl ? ` class="${originalUl.className}" style="${originalUl.getAttribute('style') || ''}"` : '',
      listItem: originalLi ? ` class="${originalLi.className}" style="${originalLi.getAttribute('style') || ''}"` : '',
      blockquote: originalBq ? ` class="${originalBq.className}" style="${originalBq.getAttribute('style') || ''}"` : ''
    }
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  async simplify(level: string, mode: string): Promise<void> {
    if (this.isSimplified) {
      this.reset()
    }

    this.articleElement = this.findArticleElement()
    if (!this.articleElement) {
      throw new Error('Could not find article content')
    }

    // Store the complete original element and its attributes
    this.originalContent = this.articleElement.cloneNode(true) as HTMLElement

    // Mark the element as being simplified to preserve its identity
    this.articleElement.setAttribute('data-simplified', 'true')

    // Extract article with placeholders
    const { text, images } = this.extractArticleWithPlaceholders()

    // Send to background for processing
    const response = await chrome.runtime.sendMessage({
      action: 'simplifyArticle',
      data: { text, level, mode, images }
    })

    if (response?.success && response.data) {
      // Preserve the original container attributes and only replace content
      const newHTML = this.reconstructHTML(response.data)
      this.articleElement.innerHTML = newHTML
      this.isSimplified = true
      this.addResetButton()

    } else {
      throw new Error(response?.error || 'Failed to simplify article')
    }
  }

  addResetButton(): void {
    if (this.resetButton) return

    this.resetButton = document.createElement('button')
    this.resetButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
      Reset Article
    `

    // Detect if the site has dark mode
    const isDarkMode = window.getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)' ||
                     document.documentElement.classList.contains('dark') ||
                     document.body.classList.contains('dark') ||
                     window.getComputedStyle(document.body).color === 'rgb(255, 255, 255)'

    this.resetButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: ${isDarkMode ? '#374151' : '#ffffff'};
      color: ${isDarkMode ? '#ffffff' : '#374151'};
      border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `

    this.resetButton.addEventListener('click', () => this.reset())
    this.resetButton.addEventListener('mouseenter', () => {
      if (this.resetButton) {
        this.resetButton.style.transform = 'scale(1.05)'
        this.resetButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
      }
    })
    this.resetButton.addEventListener('mouseleave', () => {
      if (this.resetButton) {
        this.resetButton.style.transform = 'scale(1)'
        this.resetButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
      }
    })

    document.body.appendChild(this.resetButton)
  }

  reset(): void {
    if (this.originalContent && this.articleElement) {
      // Restore the complete original element including all attributes
      this.articleElement.innerHTML = this.originalContent.innerHTML

      // Remove the simplified marker
      this.articleElement.removeAttribute('data-simplified')
      this.isSimplified = false

    }

    if (this.resetButton) {
      this.resetButton.remove()
      this.resetButton = null
    }

    this.imageMap.clear()
  }

}

// Initialize simplifier
const simplifier = new ArticleSimplifier()

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'simplifyPage') {
    simplifier.simplify(message.level, message.mode)
      .then(() => sendResponse({ success: true }))
      .catch((error: Error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

export {}