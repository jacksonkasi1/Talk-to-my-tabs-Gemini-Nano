import type { SummarizerOptions, MonitorOptions } from '../types'

export const createSummarizer = async (
  options?: SummarizerOptions & MonitorOptions
): Promise<SummarizerSession> => {
  if (!('Summarizer' in self)) {
    throw new Error('Summarizer API not available')
  }

  try {
    const summarizer = await Summarizer.create({
      type: options?.type ?? 'key-points',
      format: options?.format ?? 'markdown',
      length: options?.length ?? 'medium',
      sharedContext: options?.sharedContext,
      monitor: options?.monitor
    })

    return summarizer
  } catch (error) {
    console.error('Failed to create Summarizer:', error)
    throw error
  }
}
