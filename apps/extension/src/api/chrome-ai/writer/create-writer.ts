import type { WriterOptions, MonitorOptions } from '../types'

export const createWriter = async (
  options?: WriterOptions & MonitorOptions
): Promise<WriterSession> => {
  if (!('Writer' in self)) {
    throw new Error('Writer API not available')
  }

  try {
    const writer = await Writer.create({
      tone: options?.tone ?? 'neutral',
      format: options?.format ?? 'markdown',
      length: options?.length ?? 'medium',
      sharedContext: options?.sharedContext,
      monitor: options?.monitor
    })

    return writer
  } catch (error) {
    console.error('Failed to create Writer:', error)
    throw error
  }
}
