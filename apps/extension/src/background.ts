// apps/extension/src/background.ts
// ** import utils
import { injectContentExtractor } from '@/logic/contentExtractor'

// ** import api
import { generateArticleFromContent } from '@/api/chrome-ai/articles'
import { simplifyArticle, type SimplificationLevel } from '@/api/chrome-ai/articles'

// ** import types
import type { Article } from '@/types/article'

export {}

// Process article simplification using Chrome AI
async function simplifyArticleText(text: string, level: string, mode: string): Promise<string> {
  try {
    const levelDescriptions = {
      'Low': 'Minor adjustments for clarity while keeping most of the original structure and vocabulary',
      'Mid': 'Moderate simplification with clearer sentence structures and more common vocabulary',
      'High': 'Strong simplification using simple words, short sentences, and basic structures'
    }

    const modeDescriptions = {
      'simplify-complex': 'Break down difficult concepts into simpler explanations with examples',
      'visual-organization': 'Create shorter paragraphs, clear headings, bullet points for better scanning',
      'reading-flow': 'Make text flow naturally with consistent sentence patterns and smooth transitions'
    }

    const context = `Simplification Level: ${level} - ${levelDescriptions[level as keyof typeof levelDescriptions]}
Optimization Mode: ${mode} - ${modeDescriptions[mode as keyof typeof modeDescriptions]}

CRITICAL RULES:
1. PRESERVE ALL image placeholders EXACTLY as they appear (e.g., [[IMG_1]], [[IMG_2]])
2. Keep images in their EXACT original positions in the text
3. Do NOT add, remove, or reorder any image placeholders
4. Maintain the general meaning and key information
5. Output plain text with markdown formatting (# for headings, - for bullet points, > for quotes)
6. Keep the same paragraph structure around images`

    const result = await simplifyArticle(text, level as SimplificationLevel, context)
    return result || text
  } catch (error) {
    console.error('Article simplification error:', error)
    throw error
  }
}

// Save article function that can be called directly
async function saveCurrentArticle(sendResponse?: (response: any) => void) {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]?.id) {
      try {
        // Extract content from the page
        const pageContent = await injectContentExtractor(tabs[0].id)

        if (!pageContent) {
          sendResponse?.({ success: false, error: 'Failed to extract content' })
          return
        }

        // Generate article using LLM
        console.log('Generating article from content...')
        const markdownContent = await generateArticleFromContent(pageContent)

        if (!markdownContent) {
          sendResponse?.({ success: false, error: 'Failed to generate article' })
          return
        }

        // Extract title from markdown (first # heading)
        const titleMatch = markdownContent.match(/^#\s+(.+)$/m)
        const generatedTitle = titleMatch ? titleMatch[1] : pageContent.title

        // Extract description (first paragraph or italic text)
        const descMatch = markdownContent.match(/^_(.+)_$/m) ||
                         markdownContent.match(/^([^#\n].{50,200})/m)
        const generatedDesc = descMatch ? descMatch[1] : pageContent.description || ''

        // Calculate read time based on word count
        const wordCount = markdownContent.split(/\s+/).length
        const readTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min read'

        // Validate and clean image URL
        let validImageUrl: string | undefined = undefined
        if (pageContent.imageUrl) {
          try {
            // Ensure it's a valid URL
            new URL(pageContent.imageUrl)
            validImageUrl = pageContent.imageUrl
          } catch {
            console.warn('Invalid image URL:', pageContent.imageUrl)
          }
        }

        // Create article object with ISO string date
        const articleData: Article = {
          id: Date.now().toString(),
          title: generatedTitle,
          url: pageContent.url,
          description: generatedDesc,
          content: markdownContent,
          imageUrl: validImageUrl,
          source: new URL(pageContent.url).hostname.replace('www.', ''),
          readTime: readTime,
          savedAt: new Date().toISOString(),
          isRead: false
        }

        // Save to Chrome storage
        chrome.storage.local.get(['articles'], (result) => {
          const articles = result.articles || []
          articles.unshift(articleData)

          // Keep only last 100 articles to manage storage
          const trimmedArticles = articles.slice(0, 100)

          chrome.storage.local.set({ articles: trimmedArticles }, () => {
            console.log("Article saved:", articleData.title)
            sendResponse?.({ success: true, article: articleData })
          })
        })
      } catch (error) {
        console.error('Error saving article:', error)
        const errorMessage = error instanceof Error
          ? error.message
          : String(error)
        sendResponse?.({ success: false, error: errorMessage })
      }
    } else {
      sendResponse?.({ success: false, error: 'No active tab found' })
    }
  })
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return

    switch (command) {
      case "open-chat-sidebar":
        // Same as floating button - open side panel
        if (tabs[0].windowId) {
          chrome.sidePanel.open({ windowId: tabs[0].windowId })
        }
        break

      case "open-popup":
        // Open popup functionality in new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') })
        break
    }
  })
})

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("TalkToMyTabs extension installed")

  // Disable side panel on action click so extension icon shows popup
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })

  // Create context menu items
  chrome.contextMenus.create({
    id: "chat-with-page",
    title: "Chat with Page",
    contexts: ["page", "selection"],
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  })

  chrome.contextMenus.create({
    id: "save-article",
    title: "Save Article",
    contexts: ["page"],
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  })

  chrome.contextMenus.create({
    id: "simplify-article",
    title: "Simplify Article",
    contexts: ["page"],
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  })
})

// Handle messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  switch (message.action) {
    case 'openSidePanel':
      // Open immediately without async operations to preserve user gesture
      if (sender.tab?.windowId) {
        // Call open synchronously and handle promise separately
        const openPromise = chrome.sidePanel.open({ windowId: sender.tab.windowId })
        
        // Send response immediately
        sendResponse({ success: true })
        
        // Handle promise result separately (not blocking the response)
        openPromise.catch((error) => {
          console.error('Error opening side panel:', error)
          // Can't send error back as we already responded
        })
      } else {
        sendResponse({ success: false, error: 'No window ID available' })
      }
      // Don't return true - we already sent the response synchronously
      break

    case 'simplifyText':
      // Inject content script code directly
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]?.id) {
          try {
            // First inject the simplifier script as a function
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                // ArticleSimplifier class injected directly
                if ((window as any).ArticleSimplifier) return;
                
                class ArticleSimplifier {
                  private originalContent: HTMLElement | null = null
                  private articleElement: Element | null = null
                  private resetButton: HTMLElement | null = null
                  private imageMap: Map<string, any> = new Map()
                  private isSimplified: boolean = false

                  findArticleElement(): Element | null {
                    // First try semantic selectors
                    const semanticSelectors = [
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

                    for (const selector of semanticSelectors) {
                      const element = document.querySelector(selector)
                      if (element) {
                        const text = element.textContent || ''
                        if (text.length > 300) {
                          return element
                        }
                      }
                    }

                    // Fallback: look for containers with lots of text content
                    return this.findContentByHeuristics()
                  }

                  findContentByHeuristics(): Element | null {
                    // Look for the element with the most readable text content
                    const candidates = [
                      ...Array.from(document.querySelectorAll('div')),
                      ...Array.from(document.querySelectorAll('section')),
                      ...Array.from(document.querySelectorAll('center')), // for older websites
                      document.body // ultimate fallback
                    ].filter(el => {
                      // Skip elements that are likely not content
                      const skipSelectors = [
                        'header', 'nav', 'footer', 'aside', 'script', 'style',
                        '.header', '.nav', '.footer', '.sidebar', '.menu',
                        '.navigation', '.comments', '.comment-section'
                      ]

                      return !skipSelectors.some(selector =>
                        el.matches(selector) || el.closest(selector)
                      )
                    })

                    let bestCandidate = null
                    let bestScore = 0

                    candidates.forEach(candidate => {
                      const score = this.calculateContentScore(candidate)
                      if (score > bestScore && score > 500) { // minimum threshold
                        bestScore = score
                        bestCandidate = candidate
                      }
                    })

                    // If we still haven't found anything, try to create a container
                    if (!bestCandidate) {
                      bestCandidate = this.createContentContainer()
                    }

                    return bestCandidate
                  }

                  calculateContentScore(element: Element): number {
                    const text = element.textContent || ''
                    const paragraphs = element.querySelectorAll('p')
                    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
                    const lists = element.querySelectorAll('ul, ol')

                    // Score based on content richness
                    let score = text.length * 0.1 // base text length
                    score += paragraphs.length * 50 // paragraph count
                    score += headings.length * 30 // heading count
                    score += lists.length * 20 // list count

                    // Bonus for having varied content
                    if (paragraphs.length > 3 && headings.length > 0) score += 200

                    // Penalty for too many links (likely navigation)
                    const links = element.querySelectorAll('a')
                    if (links.length > paragraphs.length) score -= links.length * 10

                    return score
                  }

                  createContentContainer(): Element {
                    // For pages with no clear container, create one around all meaningful content
                    const meaningfulElements = Array.from(document.body.children).filter(child => {
                      const tagName = child.tagName.toLowerCase()
                      const hasText = (child.textContent || '').trim().length > 20
                      const isContentTag = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'section', 'center', 'blockquote', 'ul', 'ol'].includes(tagName)

                      return hasText && isContentTag && !this.isNavigationElement(child as HTMLElement)
                    })

                    if (meaningfulElements.length > 0) {
                      // Create a virtual container
                      const container = document.createElement('div')
                      container.style.display = 'none' // hidden container for processing

                      // Clone all meaningful elements into the container
                      meaningfulElements.forEach(el => {
                        container.appendChild(el.cloneNode(true))
                      })

                      document.body.appendChild(container)
                      return container
                    }

                    return document.body // ultimate fallback
                  }

                  isNavigationElement(element: HTMLElement): boolean {
                    const navigationIndicators = [
                      'nav', 'header', 'footer', 'aside', 'menu',
                      'navigation', 'breadcrumb', 'pagination'
                    ]

                    const className = element.className.toLowerCase()
                    const id = element.id.toLowerCase()
                    const tagName = element.tagName.toLowerCase()

                    return navigationIndicators.some(indicator =>
                      className.includes(indicator) ||
                      id.includes(indicator) ||
                      tagName === indicator
                    )
                  }

                  extractArticleWithPlaceholders() {
                    if (!this.articleElement) {
                      throw new Error('No article element found')
                    }

                    const cloned = this.articleElement.cloneNode(true) as HTMLElement
                    const images = cloned.querySelectorAll('img')
                    const imageData: any[] = []
                    
                    images.forEach((img, index) => {
                      const placeholder = `[[IMG_${index + 1}]]`
                      const data = {
                        id: placeholder,
                        src: img.src || img.getAttribute('data-src') || '',
                        alt: img.alt || '',
                        className: img.className || '',
                        width: img.getAttribute('width') || '',
                        height: img.getAttribute('height') || '',
                        style: img.getAttribute('style') || ''
                      }
                      
                      imageData.push(data)
                      this.imageMap.set(placeholder, data)
                      
                      const textNode = document.createTextNode(placeholder)
                      img.parentNode?.replaceChild(textNode, img)
                    })

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
                        
                        if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
                          return
                        }
                        
                        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tagName)) {
                          lines.push('\n\n')
                        }
                        
                        for (const child of Array.from(node.childNodes)) {
                          processNode(child)
                        }
                        
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
                    const paragraphs = simplifiedText.split(/\n\n+/)
                    let html = ''
                    
                    paragraphs.forEach(paragraph => {
                      const trimmed = paragraph.trim()
                      if (!trimmed) return
                      
                      const imageMatches = trimmed.match(/\[\[IMG_\d+\]\]/g)
                      
                      if (imageMatches) {
                        let currentText = trimmed
                        
                        imageMatches.forEach(placeholder => {
                          const parts = currentText.split(placeholder)
                          const beforeText = parts[0]?.trim()
                          
                          if (beforeText) {
                            html += `<p>${this.escapeHtml(beforeText)}</p>\n`
                          }
                          
                          const imageData = this.imageMap.get(placeholder)
                          if (imageData) {
                            html += `<img src="${imageData.src}" alt="${imageData.alt}"${imageData.className ? ` class="${imageData.className}"` : ''}${imageData.width ? ` width="${imageData.width}"` : ''}${imageData.height ? ` height="${imageData.height}"` : ''}${imageData.style ? ` style="${imageData.style}"` : ''}${imageData.srcset ? ` srcset="${imageData.srcset}"` : ''}${imageData.sizes ? ` sizes="${imageData.sizes}"` : ''}${imageData.loading ? ` loading="${imageData.loading}"` : ''}>\n`
                          }
                          
                          currentText = parts.slice(1).join(placeholder)
                        })
                        
                        const afterText = currentText.trim()
                        if (afterText) {
                          html += `<p>${this.escapeHtml(afterText)}</p>\n`
                        }
                      } else if (trimmed.startsWith('#')) {
                        const match = trimmed.match(/^(#+)\s+(.+)/)
                        if (match) {
                          const level = Math.min(match[1].length, 6)
                          html += `<h${level}>${this.escapeHtml(match[2])}</h${level}>\n`
                        }
                      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                        const items = trimmed.split('\n').filter((line: string) => line.trim())
                        html += '<ul>\n'
                        items.forEach((item: string) => {
                          const text = item.replace(/^[-*]\s+/, '').trim()
                          html += `  <li>${this.escapeHtml(text)}</li>\n`
                        })
                        html += '</ul>\n'
                      } else if (trimmed.match(/^\d+\.\s/)) {
                        const items = trimmed.split('\n').filter((line: string) => line.trim())
                        html += '<ol>\n'
                        items.forEach((item: string) => {
                          const text = item.replace(/^\d+\.\s+/, '').trim()
                          html += `  <li>${this.escapeHtml(text)}</li>\n`
                        })
                        html += '</ol>\n'
                      } else if (trimmed.startsWith('>')) {
                        const text = trimmed.substring(1).trim()
                        html += `<blockquote>${this.escapeHtml(text)}</blockquote>\n`
                      } else {
                        html += `<p>${this.escapeHtml(trimmed)}</p>\n`
                      }
                    })
                    
                    return html
                  }

                  escapeHtml(text: string): string {
                    const div = document.createElement('div')
                    div.textContent = text
                    return div.innerHTML
                  }

                  async simplify(level: string, mode: string): Promise<void> {
                    try {
                      if (this.isSimplified) {
                        this.reset()
                      }

                      this.articleElement = this.findArticleElement()
                      if (!this.articleElement) {
                        throw new Error('Could not find readable content on this page')
                      }

                      // Store the complete original element and its attributes
                      this.originalContent = this.articleElement.cloneNode(true) as HTMLElement

                      // Mark the element as being simplified to preserve its identity
                      this.articleElement.setAttribute('data-simplified', 'true')

                      const { text, images } = this.extractArticleWithPlaceholders()

                      if (!text || text.trim().length < 100) {
                        throw new Error('Not enough content to simplify on this page')
                      }


                      const response = await chrome.runtime.sendMessage({
                        action: 'simplifyArticle',
                        data: { text, level, mode, images }
                      })

                      if (response?.success && response.data) {
                        // For body or virtual container, we need special handling
                        const isBodyElement = this.articleElement.tagName.toLowerCase() === 'body'
                        const isVirtualContainer = (this.articleElement as HTMLElement).style.display === 'none'

                        if (isBodyElement) {
                          this.simplifyBodyContent(response.data)
                        } else if (isVirtualContainer) {
                          this.simplifyVirtualContainer(response.data)
                        } else {
                          // Normal container
                          const newHTML = this.reconstructHTML(response.data)
                          this.articleElement.innerHTML = newHTML
                        }

                        this.isSimplified = true
                        this.addResetButton()

                      } else {
                        throw new Error(response?.error || 'Failed to simplify article')
                      }
                    } catch (error) {
                      throw error
                    }
                  }

                  simplifyBodyContent(simplifiedText: string): void {
                    // Find all content paragraphs in body and replace them
                    const contentElements = Array.from(document.body.children).filter(child => {
                      const tagName = child.tagName.toLowerCase()
                      return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'center'].includes(tagName) &&
                             (child.textContent || '').trim().length > 20 &&
                             !this.isNavigationElement(child as HTMLElement)
                    })

                    if (contentElements.length === 0) return

                    // Create a wrapper for the new content
                    const wrapper = document.createElement('div')
                    wrapper.setAttribute('data-simplified-content', 'true')
                    wrapper.innerHTML = this.reconstructHTML(simplifiedText)

                    // Replace content elements with simplified version
                    if (contentElements.length > 0) {
                      const firstElement = contentElements[0]
                      firstElement.parentNode?.insertBefore(wrapper, firstElement)

                      // Hide original content elements
                      contentElements.forEach(el => {
                        (el as HTMLElement).style.display = 'none'
                        el.setAttribute('data-original-simplified', 'true')
                      })
                    }
                  }

                  simplifyVirtualContainer(simplifiedText: string): void {
                    // The virtual container was just for processing, now update the actual elements
                    const contentElements = Array.from(document.body.children).filter(child => {
                      return (child.textContent || '').trim().length > 20 &&
                             !this.isNavigationElement(child as HTMLElement) &&
                             !child.hasAttribute('data-simplified')
                    })

                    // Create simplified content wrapper
                    const wrapper = document.createElement('div')
                    wrapper.setAttribute('data-simplified-content', 'true')
                    wrapper.innerHTML = this.reconstructHTML(simplifiedText)

                    if (contentElements.length > 0) {
                      const firstElement = contentElements[0]
                      firstElement.parentNode?.insertBefore(wrapper, firstElement)

                      // Hide original elements
                      contentElements.forEach(el => {
                        (el as HTMLElement).style.display = 'none'
                        el.setAttribute('data-original-simplified', 'true')
                      })
                    }
                  }

                  addResetButton(): void {
                    if (this.resetButton) return

                    this.resetButton = document.createElement('button')
                    this.resetButton.textContent = 'Reset Article'
                    this.resetButton.style.cssText = `
                      position: fixed;
                      bottom: 20px;
                      right: 20px;
                      padding: 12px 24px;
                      background-color: #ffffff;
                      color: #000000;
                      border: 1px solid #e5e7eb;
                      border-radius: 8px;
                      font-size: 14px;
                      font-weight: 500;
                      cursor: pointer;
                      z-index: 9999;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                      transition: all 0.2s;
                    `

                    this.resetButton.addEventListener('click', () => this.reset())
                    this.resetButton.addEventListener('mouseenter', () => {
                      if (this.resetButton) {
                        this.resetButton.style.transform = 'scale(1.05)'
                        this.resetButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    })
                    this.resetButton.addEventListener('mouseleave', () => {
                      if (this.resetButton) {
                        this.resetButton.style.transform = 'scale(1)'
                        this.resetButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    })

                    document.body.appendChild(this.resetButton)
                  }

                  reset(): void {
                    try {
                      // Remove simplified content wrapper if it exists
                      const simplifiedWrapper = document.querySelector('[data-simplified-content]')
                      if (simplifiedWrapper) {
                        simplifiedWrapper.remove()
                      }

                      // Restore hidden original elements
                      const hiddenElements = document.querySelectorAll('[data-original-simplified]')
                      hiddenElements.forEach(el => {
                        (el as HTMLElement).style.display = ''
                        el.removeAttribute('data-original-simplified')
                      })

                      // Restore original content if we have a specific container
                      if (this.originalContent && this.articleElement && !this.articleElement.hasAttribute('data-simplified-content')) {
                        const isVirtualContainer = (this.articleElement as HTMLElement).style.display === 'none'
                        if (isVirtualContainer) {
                          // Remove the virtual container
                          this.articleElement.remove()
                        } else {
                          // Restore normal container
                          this.articleElement.innerHTML = this.originalContent.innerHTML
                        }
                      }

                      // Clean up attributes
                      if (this.articleElement) {
                        this.articleElement.removeAttribute('data-simplified')
                      }

                      this.isSimplified = false
                      this.articleElement = null
                      this.originalContent = null

                      // Remove reset button
                      if (this.resetButton) {
                        this.resetButton.remove()
                        this.resetButton = null
                      }

                      this.imageMap.clear()

                    } catch (error) {
                      console.error('Error during reset:', error)
                      // Force reload as fallback
                      window.location.reload()
                    }
                  }

                }

                // Theme definitions matching the popup options
                const themes = {
                  default: { backgroundColor: '', textColor: '' },
                  cream: { backgroundColor: '#FDF6E3', textColor: '#5B4636' },
                  dark: { backgroundColor: '#1a1a1b', textColor: '#E0E0E0' },
                  sepia: { backgroundColor: '#F4ECD8', textColor: '#5B4636' }
                }

                // Apply display settings function
                function applyDisplaySettings(settings: any) {
                  // If display settings are disabled, remove all styling
                  if (!settings.enabled) {
                    removeAllDisplaySettings()
                    return
                  }

                  // If settings are default values, remove all styling instead
                  if (settings.pageTheme === 'default' &&
                      !settings.useOpenDyslexic &&
                      settings.lineSpacing === 1.4 &&
                      settings.letterSpacing === 0 &&
                      settings.wordSpacing === 0) {
                    removeAllDisplaySettings()
                    return
                  }

                  // Apply page theme
                  if (settings.pageTheme && settings.pageTheme !== 'default' && themes[settings.pageTheme as keyof typeof themes]) {
                    applyTheme(settings.pageTheme)
                  } else {
                    // Remove theme if default
                    const themeStyle = document.getElementById('theme-style')
                    if (themeStyle) {
                      themeStyle.remove()
                    }
                  }

                  // Apply OpenDyslexic font
                  toggleOpenDyslexicFont(settings.useOpenDyslexic || false)

                  // Apply spacing adjustments only if they're not default values
                  if (settings.lineSpacing !== 1.4 || settings.letterSpacing !== 0 || settings.wordSpacing !== 0) {
                    applySpacingAdjustments(
                      settings.lineSpacing || 1.4,
                      settings.letterSpacing || 0,
                      settings.wordSpacing || 0
                    )
                  } else {
                    // Remove spacing adjustments if default
                    const spacingStyle = document.getElementById('spacing-adjustments-style')
                    if (spacingStyle) {
                      spacingStyle.remove()
                    }
                  }
                }

                // Remove all display settings function
                function removeAllDisplaySettings() {
                  // Remove theme style
                  const themeStyle = document.getElementById('theme-style')
                  if (themeStyle) {
                    themeStyle.remove()
                  }

                  // Remove font style
                  const fontStyle = document.getElementById('opendyslexic-font-style')
                  if (fontStyle) {
                    fontStyle.remove()
                  }

                  // Remove font face definition
                  const fontFaceStyle = document.getElementById('opendyslexic-font-face')
                  if (fontFaceStyle) {
                    fontFaceStyle.remove()
                  }

                  // Remove spacing adjustments
                  const spacingStyle = document.getElementById('spacing-adjustments-style')
                  if (spacingStyle) {
                    spacingStyle.remove()
                  }
                }

                // Apply theme function
                function applyTheme(themeName: string) {
                  const theme = themes[themeName as keyof typeof themes]
                  if (!theme) return

                  const { backgroundColor, textColor } = theme

                  let themeStyle = document.getElementById('theme-style')
                  if (!themeStyle) {
                    themeStyle = document.createElement('style')
                    themeStyle.id = 'theme-style'
                    document.head.appendChild(themeStyle)
                  }

                  themeStyle.textContent = `
                    html, body {
                      background-color: ${backgroundColor} !important;
                      color: ${textColor} !important;
                    }
                    body * {
                      background-color: ${backgroundColor} !important;
                      color: ${textColor} !important;
                    }
                  `
                }

                // Toggle OpenDyslexic font function
                function toggleOpenDyslexicFont(enabled: boolean) {
                  if (enabled) {
                    // Add font-face definition if it doesn't exist
                    if (!document.getElementById('opendyslexic-font-face')) {
                      const fontFaceStyle = document.createElement('style')
                      fontFaceStyle.id = 'opendyslexic-font-face'
                      fontFaceStyle.textContent = `
                        @font-face {
                          font-family: 'OpenDyslexic';
                          src: url('${chrome.runtime.getURL('assets/fonts/OpenDyslexic-Regular.otf')}') format('opentype');
                          font-weight: normal;
                          font-style: normal;
                          font-display: swap;
                        }
                      `
                      document.head.appendChild(fontFaceStyle)
                    }

                    // Create or update style element to apply font to entire page
                    let fontStyle = document.getElementById('opendyslexic-font-style')
                    if (!fontStyle) {
                      fontStyle = document.createElement('style')
                      fontStyle.id = 'opendyslexic-font-style'
                      document.head.appendChild(fontStyle)
                    }

                    fontStyle.textContent = `
                      body, body * {
                        font-family: 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
                      }
                    `
                  } else {
                    // Remove the font style applied to the entire page
                    const fontStyle = document.getElementById('opendyslexic-font-style')
                    if (fontStyle && fontStyle.parentNode) {
                      fontStyle.parentNode.removeChild(fontStyle)
                    }

                    // Optionally remove the font-face definition
                    const fontFaceStyle = document.getElementById('opendyslexic-font-face')
                    if (fontFaceStyle && fontFaceStyle.parentNode) {
                      fontFaceStyle.parentNode.removeChild(fontFaceStyle)
                    }
                  }
                }

                // Apply spacing adjustments function
                function applySpacingAdjustments(lineSpacing: number, letterSpacing: number, wordSpacing: number) {
                  const existingStyle = document.getElementById('spacing-adjustments-style')
                  if (existingStyle) {
                    existingStyle.remove()
                  }

                  const style = document.createElement('style')
                  style.id = 'spacing-adjustments-style'
                  style.textContent = `
                    body, body * {
                      line-height: ${lineSpacing} !important;
                      letter-spacing: ${letterSpacing}px !important;
                      word-spacing: ${wordSpacing}px !important;
                    }
                  `
                  document.head.appendChild(style)
                }

                (window as any).ArticleSimplifier = ArticleSimplifier;
                (window as any).articleSimplifier = new ArticleSimplifier();
                (window as any).applyDisplaySettings = applyDisplaySettings;
              }
            })

            // Then trigger the simplification
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (level, mode, displaySettings) => {
                const simplifier = (window as any).articleSimplifier
                if (simplifier) {
                  // Apply display settings first
                  if (displaySettings) {
                    (window as any).applyDisplaySettings(displaySettings)
                  }

                  return simplifier.simplify(level, mode)
                    .then(() => ({ success: true }))
                    .catch((error: Error) => ({ success: false, error: error.message }))
                }
                return Promise.resolve({ success: false, error: 'Simplifier not initialized' })
              },
              args: [message.data.level, message.data.mode, message.data.displaySettings]
            })

            sendResponse({ success: true })
          } catch (error) {
            console.error('Error injecting simplifier:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            sendResponse({ success: false, error: errorMessage })
          }
        }
      })
      return true

    case 'applyDisplaySettings':
      // Apply only display settings without simplification
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]?.id) {
          try {
            // First inject the display settings functions if they don't exist
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                if (!(window as any).applyDisplaySettings) {
                  // Theme definitions matching the popup options
                  const themes = {
                    default: { backgroundColor: '', textColor: '' },
                    cream: { backgroundColor: '#FDF6E3', textColor: '#5B4636' },
                    dark: { backgroundColor: '#1a1a1b', textColor: '#E0E0E0' },
                    sepia: { backgroundColor: '#F4ECD8', textColor: '#5B4636' }
                  }

                  // Apply display settings function
                  function applyDisplaySettings(settings: any) {
                    // If display settings are disabled, remove all styling
                    if (!settings.enabled) {
                      removeAllDisplaySettings()
                      return
                    }

                    // If settings are default values, remove all styling instead
                    if (settings.pageTheme === 'default' &&
                        !settings.useOpenDyslexic &&
                        settings.lineSpacing === 1.4 &&
                        settings.letterSpacing === 0 &&
                        settings.wordSpacing === 0) {
                      removeAllDisplaySettings()
                      return
                    }

                    // Apply page theme
                    if (settings.pageTheme && settings.pageTheme !== 'default' && themes[settings.pageTheme as keyof typeof themes]) {
                      applyTheme(settings.pageTheme)
                    } else {
                      // Remove theme if default
                      const themeStyle = document.getElementById('theme-style')
                      if (themeStyle) {
                        themeStyle.remove()
                      }
                    }

                    // Apply OpenDyslexic font
                    toggleOpenDyslexicFont(settings.useOpenDyslexic || false)

                    // Apply spacing adjustments only if they're not default values
                    if (settings.lineSpacing !== 1.4 || settings.letterSpacing !== 0 || settings.wordSpacing !== 0) {
                      applySpacingAdjustments(
                        settings.lineSpacing || 1.4,
                        settings.letterSpacing || 0,
                        settings.wordSpacing || 0
                      )
                    } else {
                      // Remove spacing adjustments if default
                      const spacingStyle = document.getElementById('spacing-adjustments-style')
                      if (spacingStyle) {
                        spacingStyle.remove()
                      }
                    }
                  }

                  // Remove all display settings function
                  function removeAllDisplaySettings() {
                    // Remove theme style
                    const themeStyle = document.getElementById('theme-style')
                    if (themeStyle) {
                      themeStyle.remove()
                    }

                    // Remove font style
                    const fontStyle = document.getElementById('opendyslexic-font-style')
                    if (fontStyle) {
                      fontStyle.remove()
                    }

                    // Remove font face definition
                    const fontFaceStyle = document.getElementById('opendyslexic-font-face')
                    if (fontFaceStyle) {
                      fontFaceStyle.remove()
                    }

                    // Remove spacing adjustments
                    const spacingStyle = document.getElementById('spacing-adjustments-style')
                    if (spacingStyle) {
                      spacingStyle.remove()
                    }
                  }

                  // Apply theme function
                  function applyTheme(themeName: string) {
                    const theme = themes[themeName as keyof typeof themes]
                    if (!theme) return

                    const { backgroundColor, textColor } = theme

                    let themeStyle = document.getElementById('theme-style')
                    if (!themeStyle) {
                      themeStyle = document.createElement('style')
                      themeStyle.id = 'theme-style'
                      document.head.appendChild(themeStyle)
                    }

                    themeStyle.textContent = `
                      html, body {
                        background-color: ${backgroundColor} !important;
                        color: ${textColor} !important;
                      }
                      body * {
                        background-color: ${backgroundColor} !important;
                        color: ${textColor} !important;
                      }
                    `
                  }

                  // Toggle OpenDyslexic font function
                  function toggleOpenDyslexicFont(enabled: boolean) {
                    if (enabled) {
                      // Add font-face definition if it doesn't exist
                      if (!document.getElementById('opendyslexic-font-face')) {
                        const fontFaceStyle = document.createElement('style')
                        fontFaceStyle.id = 'opendyslexic-font-face'
                        fontFaceStyle.textContent = `
                          @font-face {
                            font-family: 'OpenDyslexic';
                            src: url('${chrome.runtime.getURL('assets/fonts/OpenDyslexic-Regular.otf')}') format('opentype');
                            font-weight: normal;
                            font-style: normal;
                            font-display: swap;
                          }
                        `
                        document.head.appendChild(fontFaceStyle)
                      }

                      // Create or update style element to apply font to entire page
                      let fontStyle = document.getElementById('opendyslexic-font-style')
                      if (!fontStyle) {
                        fontStyle = document.createElement('style')
                        fontStyle.id = 'opendyslexic-font-style'
                        document.head.appendChild(fontStyle)
                      }

                      fontStyle.textContent = `
                        body, body * {
                          font-family: 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
                        }
                      `
                    } else {
                      // Remove the font style applied to the entire page
                      const fontStyle = document.getElementById('opendyslexic-font-style')
                      if (fontStyle && fontStyle.parentNode) {
                        fontStyle.parentNode.removeChild(fontStyle)
                      }

                      // Optionally remove the font-face definition
                      const fontFaceStyle = document.getElementById('opendyslexic-font-face')
                      if (fontFaceStyle && fontFaceStyle.parentNode) {
                        fontFaceStyle.parentNode.removeChild(fontFaceStyle)
                      }
                    }
                  }

                  // Apply spacing adjustments function
                  function applySpacingAdjustments(lineSpacing: number, letterSpacing: number, wordSpacing: number) {
                    const existingStyle = document.getElementById('spacing-adjustments-style')
                    if (existingStyle) {
                      existingStyle.remove()
                    }

                    const style = document.createElement('style')
                    style.id = 'spacing-adjustments-style'
                    style.textContent = `
                      body, body * {
                        line-height: ${lineSpacing} !important;
                        letter-spacing: ${letterSpacing}px !important;
                        word-spacing: ${wordSpacing}px !important;
                      }
                    `
                    document.head.appendChild(style)
                  }

                  (window as any).applyDisplaySettings = applyDisplaySettings
                }
              }
            })

            // Then apply the display settings
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (displaySettings) => {
                if ((window as any).applyDisplaySettings) {
                  (window as any).applyDisplaySettings(displaySettings)
                  return { success: true }
                }
                return { success: false, error: 'Display settings not available' }
              },
              args: [message.data.displaySettings]
            })
            sendResponse({ success: true })
          } catch (error) {
            console.error('Error applying display settings:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            sendResponse({ success: false, error: errorMessage })
          }
        }
      })
      return true

    case 'simplifyArticle':
      // Process the simplification request
      simplifyArticleText(message.data.text, message.data.level, message.data.mode)
        .then(simplifiedText => {
          sendResponse({ success: true, data: simplifiedText })
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          sendResponse({ success: false, error: errorMessage })
        })
      return true
      
    case 'saveArticle':
      // Use the extracted function
      saveCurrentArticle(sendResponse)
      return true
    
    case 'getActiveTabContent':
      // Get content from active tab
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        console.log('🔍 [Background] getActiveTabContent requested')
        console.log('   Active tabs:', tabs)
        if (tabs[0]?.id && tabs[0]?.url) {
          // Check if URL is restricted
          const url = tabs[0].url
          const restrictedPatterns = [
            /^chrome:\/\//,
            /^chrome-extension:\/\//,
            /^about:/,
            /^data:/,
            /^file:\/\//,
            /^view-source:/
          ]
          
          const isRestricted = restrictedPatterns.some(pattern => pattern.test(url))
          
          if (isRestricted) {
            console.warn('   ⚠️ Restricted URL:', url)
            sendResponse({ 
              success: false, 
              error: 'restricted_url',
              message: 'Cannot access content from this page type (chrome://, extension pages, etc.)'
            })
            return
          }
          
          try {
            console.log('   Extracting content from tab:', tabs[0].id, url)
            const content = await injectContentExtractor(tabs[0].id)
            console.log('   Extracted content:', {
              hasContent: !!content,
              title: content?.title,
              url: content?.url,
              contentLength: content?.content?.length || 0,
              contentPreview: content?.content?.substring(0, 100)
            })
            if (content) {
              sendResponse({ success: true, data: content })
            } else {
              console.warn('   ⚠️ No content extracted')
              sendResponse({ success: false, error: 'no_content', message: 'No content could be extracted from this page' })
            }
          } catch (error) {
            console.error('   ❌ Error extracting content:', error)
            const errorMessage = error instanceof Error 
              ? error.message 
              : String(error)
            sendResponse({ success: false, error: 'extraction_error', message: errorMessage })
          }
        } else {
          console.error('   ❌ No active tab found')
          sendResponse({ success: false, error: 'no_tab', message: 'No active tab found' })
        }
      })
      return true
      
    default:
      console.log("Unknown action:", message.action)
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return

  switch (info.menuItemId) {
    case "chat-with-page":
      // Open side panel for chat
      chrome.sidePanel.open({ windowId: tab.windowId! })
      break

    case "save-article":
      // Call the save function directly
      saveCurrentArticle((response) => {
        if (response?.success) {
          // Show a notification
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: '/icon.png',
            title: 'Article Saved!',
            message: response.article?.title || 'Page saved successfully'
          })
        } else {
          console.error('Failed to save article:', response?.error)
        }
      })
      break

    case "simplify-article":
      // Open new tab with popup functionality for article simplification
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') })
      break

    default:
      console.log("Unknown context menu item:", info.menuItemId)
  }
})