export const destroyWriter = (writer: WriterSession): void => {
  try {
    writer.destroy()
  } catch (error) {
    console.error('Failed to destroy writer:', error)
  }
}
