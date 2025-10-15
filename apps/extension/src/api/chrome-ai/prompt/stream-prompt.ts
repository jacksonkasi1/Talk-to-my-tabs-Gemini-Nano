export const streamPrompt = async (
  session: LanguageModelSession,
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  try {
    const stream = session.promptStreaming(prompt)
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(value)
    }
  } catch (error) {
    console.error('Failed to stream prompt:', error)
    throw error
  }
}
