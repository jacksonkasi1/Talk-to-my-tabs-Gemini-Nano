export const rewrite = async (
  rewriter: RewriterSession,
  text: string,
  context?: string
): Promise<string> => {
  try {
    const result = await rewriter.rewrite(text, { context })
    return result
  } catch (error) {
    console.error('Failed to rewrite:', error)
    throw error
  }
}
