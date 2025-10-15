export const writeStreaming = async (
  writer: WriterSession,
  prompt: string,
  onChunk: (chunk: string) => void,
  context?: string
): Promise<void> => {
  try {
    const stream = writer.writeStreaming(prompt, { context })
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(value)
    }
  } catch (error) {
    console.error('Failed to write streaming:', error)
    throw error
  }
}
