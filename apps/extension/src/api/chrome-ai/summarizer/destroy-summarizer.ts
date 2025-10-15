export const destroySummarizer = (summarizer: SummarizerSession): void => {
  try {
    summarizer.destroy()
  } catch (error) {
    console.error('Failed to destroy summarizer:', error)
  }
}
