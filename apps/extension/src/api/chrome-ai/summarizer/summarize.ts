export const summarize = async (
  summarizer: SummarizerSession,
  text: string,
  context?: string
): Promise<string> => {
  try {
    const result = await summarizer.summarize(text, { context })
    return result
  } catch (error) {
    console.error('Failed to summarize:', error)
    throw error
  }
}
