export const destroyRewriter = (rewriter: RewriterSession): void => {
  try {
    rewriter.destroy()
  } catch (error) {
    console.error('Failed to destroy rewriter:', error)
  }
}
