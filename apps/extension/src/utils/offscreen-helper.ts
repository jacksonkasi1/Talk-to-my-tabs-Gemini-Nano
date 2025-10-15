/**
 * Offscreen Document Helper
 * 
 * Manages offscreen document for AI operations
 * Provides better stability by isolating heavy AI work
 */

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html'
let creating: Promise<void> | null = null

/**
 * Ensure offscreen document exists
 */
async function setupOffscreenDocument(): Promise<void> {
  // Check if document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  })

  if (existingContexts.length > 0) {
    return
  }

  // If already creating, wait for it
  if (creating) {
    await creating
    return
  }

  // Create new offscreen document
  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_SCRAPING' as chrome.offscreen.Reason],
    justification: 'Run AI operations in isolated context for better stability'
  })

  await creating
  creating = null
}

/**
 * Send AI operation to offscreen document
 */
export async function runOffscreenAI<T>(
  action: 'simplify' | 'chat' | 'generate',
  data: any
): Promise<T> {
  // Ensure offscreen document exists
  await setupOffscreenDocument()

  // Send message to offscreen
  const messageId = `${action}-${Date.now()}`
  const response = await chrome.runtime.sendMessage({
    action,
    data,
    messageId
  })

  if (!response.success) {
    throw new Error(response.error || 'Offscreen operation failed')
  }

  return response.data
}

/**
 * Close offscreen document (call when not needed)
 */
export async function closeOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  })

  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument()
  }
}
