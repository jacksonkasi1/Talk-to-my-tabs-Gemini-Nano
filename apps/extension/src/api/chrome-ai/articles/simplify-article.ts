import { summarize } from '../summarizer/summarize'
import { splitIntoChunks, estimateTokens } from '@/utils/text-chunker'
import { sessionManager } from '@/utils/session-manager'

export type SimplificationLevel = 'Low' | 'Mid' | 'High'

const MAX_INPUT_TOKENS = 4000
const CHARS_PER_TOKEN = 4

const getLengthForLevel = (level: SimplificationLevel): 'short' | 'medium' | 'long' => {
  switch (level) {
    case 'High':
      return 'short'
    case 'Mid':
      return 'medium'
    case 'Low':
      return 'long'
  }
}

/**
 * Simplify article content using Chrome AI Summarizer API
 * 
 * IMPORTANT: This function now uses a session manager to prevent system crashes
 * caused by creating too many AI sessions too quickly.
 * 
 * Based on Chrome AI best practices:
 * - https://developer.chrome.com/docs/ai/session-management
 * - https://developer.chrome.com/docs/ai/scale-summarization
 */
export const simplifyArticle = async (
  content: string,
  level: SimplificationLevel,
  context?: string,
  signal?: AbortSignal
): Promise<string> => {
  // Check if operation was cancelled
  if (signal?.aborted) {
    throw new Error('Operation cancelled')
  }

  try {
    const length = getLengthForLevel(level)
    const estimatedTokens = estimateTokens(content)

    const summarizerOptions = {
      type: 'key-points' as const,
      format: 'markdown' as const,
      length,
      sharedContext: context
    }

    // Get or create a reusable session (prevents crashes from too many sessions)
    const summarizer = await sessionManager.getSession({
      type: 'summarizer',
      options: summarizerOptions
    }) as SummarizerSession

    // Check cancellation again
    if (signal?.aborted) {
      throw new Error('Operation cancelled')
    }

    // Handle large content with chunking
    if (estimatedTokens > MAX_INPUT_TOKENS) {
      console.log(`⚠️ Large content detected (${estimatedTokens} tokens), using chunking strategy`)
      const maxChunkSize = MAX_INPUT_TOKENS * CHARS_PER_TOKEN
      const chunks = splitIntoChunks(content, { maxChunkSize, overlap: 200 })

      console.log(`📄 Split into ${chunks.length} chunks`)

      // Process chunks with delays to prevent GPU overload
      const summaries: string[] = []
      for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) {
          throw new Error('Operation cancelled')
        }

        console.log(`Processing chunk ${i + 1}/${chunks.length}`)
        const summary = await summarize(summarizer, chunks[i], context)
        summaries.push(summary)

        // Add small delay between chunks to prevent system overload
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      const combinedSummary = summaries.join('\n\n')

      // If combined summary is still too large, summarize again
      if (estimateTokens(combinedSummary) > MAX_INPUT_TOKENS) {
        console.log('🔄 Combined summary too large, creating final summary')
        
        if (signal?.aborted) {
          throw new Error('Operation cancelled')
        }

        const finalResult = await summarize(summarizer, combinedSummary, context)
        return finalResult
      }

      return combinedSummary
    }

    // Normal case: content fits in one request
    const result = await summarize(summarizer, content, context)
    return result

  } catch (error) {
    console.error('❌ Article simplification error:', error)
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('cancelled')) {
        throw new Error('Simplification was cancelled')
      }
      if (error.message.includes('timeout')) {
        throw new Error('Simplification timed out. Please try with a shorter article.')
      }
      if (error.message.includes('not available')) {
        throw new Error('Chrome AI is not available. Please check your setup.')
      }
    }
    
    throw error
  }
  // NOTE: We do NOT destroy the session here - the session manager handles that
  // This allows session reuse which prevents system crashes
}
