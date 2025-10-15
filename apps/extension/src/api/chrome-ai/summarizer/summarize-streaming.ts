export const summarizeStreaming = async (
  summarizer: SummarizerSession,
  text: string,
  onChunk: (chunk: string) => void,
  context?: string
): Promise<void> => {
  try {
    const stream = summarizer.summarizeStreaming(text, { context })
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(value)
    }
  } catch (error) {
    console.error('Failed to summarize streaming:', error)
    throw error
  }
}
