import type { RewriterOptions, MonitorOptions } from '../types'

export const createRewriter = async (
  options?: RewriterOptions & MonitorOptions
): Promise<RewriterSession> => {
  if (!('Rewriter' in self)) {
    throw new Error('Rewriter API not available')
  }

  try {
    const rewriter = await Rewriter.create({
      tone: options?.tone ?? 'as-is',
      format: options?.format ?? 'as-is',
      length: options?.length ?? 'as-is',
      sharedContext: options?.sharedContext,
      monitor: options?.monitor
    })

    return rewriter
  } catch (error) {
    console.error('Failed to create Rewriter:', error)
    throw error
  }
}
