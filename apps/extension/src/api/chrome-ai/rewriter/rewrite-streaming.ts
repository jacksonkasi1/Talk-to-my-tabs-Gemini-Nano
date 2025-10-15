export const rewriteStreaming = async (
  rewriter: RewriterSession,
  text: string,
  onChunk: (chunk: string) => void,
  context?: string
): Promise<void> => {
  try {
    const stream = rewriter.rewriteStreaming(text, { context })
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(value)
    }
  } catch (error) {
    console.error('Failed to rewrite streaming:', error)
    throw error
  }
}
