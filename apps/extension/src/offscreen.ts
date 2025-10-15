/**
 * Offscreen Document for Chrome AI Operations
 * 
 * Runs AI operations in isolated context for better stability
 * Based on: https://developer.chrome.com/docs/extensions/reference/api/offscreen
 */

import { sessionManager } from '@/utils/session-manager'
import { summarize } from '@/api/chrome-ai/summarizer/summarize'
import { sendPrompt } from '@/api/chrome-ai/prompt/send-prompt'

console.log('🔧 Offscreen document loaded')

// Message types
interface AIMessage {
  action: 'simplify' | 'chat' | 'generate'
  data: any
  messageId: string
}

// Handle messages from background/content scripts
chrome.runtime.onMessage.addListener((message: AIMessage, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message.action)

  handleAIOperation(message)
    .then(result => {
      sendResponse({ success: true, data: result })
    })
    .catch(error => {
      console.error('❌ Offscreen AI error:', error)
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      })
    })

  return true // Keep channel open for async response
})

async function handleAIOperation(message: AIMessage): Promise<any> {
  const { action, data } = message

  switch (action) {
    case 'simplify':
      return await handleSimplify(data)
    
    case 'chat':
      return await handleChat(data)
    
    case 'generate':
      return await handleGenerate(data)
    
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

/**
 * Handle simplification in offscreen
 */
async function handleSimplify(data: {
  content: string
  level: 'Low' | 'Mid' | 'High'
  context?: string
}): Promise<string> {
  const { content, level, context } = data

  const summarizerOptions = {
    type: 'key-points' as const,
    format: 'markdown' as const,
    length: level === 'High' ? 'short' : level === 'Mid' ? 'medium' : 'long',
    sharedContext: context
  }

  const summarizer = await sessionManager.getSession({
    type: 'summarizer',
    options: summarizerOptions
  }) as SummarizerSession

  const result = await summarize(summarizer, content, context)
  return result
}

/**
 * Handle chat in offscreen
 */
async function handleChat(data: {
  message: string
  systemPrompt?: string
  temperature?: number
}): Promise<string> {
  const { message, systemPrompt, temperature } = data

  const session = await sessionManager.getSession({
    type: 'languageModel',
    options: {
      systemPrompt,
      temperature: temperature ?? 0.7,
      topK: 3
    }
  }) as LanguageModelSession

  const result = await sendPrompt(session, message)
  return result
}

/**
 * Handle article generation in offscreen
 */
async function handleGenerate(data: {
  prompt: string
  systemPrompt?: string
}): Promise<string> {
  const { prompt, systemPrompt } = data

  const session = await sessionManager.getSession({
    type: 'languageModel',
    options: {
      systemPrompt,
      temperature: 0.7,
      topK: 3
    }
  }) as LanguageModelSession

  const result = await sendPrompt(session, prompt)
  return result
}

// Cleanup on unload
window.addEventListener('unload', async () => {
  console.log('🧹 Offscreen cleanup')
  await sessionManager.destroyAll()
})
