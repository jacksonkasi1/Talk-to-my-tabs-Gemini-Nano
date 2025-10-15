// apps/extension/src/contents/content-extractor.tsx
// ** import types
import type { PlasmoCSConfig } from "plasmo"

// ** import utils
import { extractPageContent } from "@/utils/contentExtractor"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle"
}

// Make sure content script is ready
console.log("Content extractor loaded on:", window.location.href)

// Listen for content extraction requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request)
  
  if (request.action === 'extractContent') {
    try {
      const content = extractPageContent()
      console.log("Extracted content:", content)
      sendResponse({ success: true, data: content })
    } catch (error) {
      console.error("Error extracting content:", error)
      // Handle unknown error type
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error)
      sendResponse({ success: false, error: errorMessage })
    }
  }
  
  return true // Keep message channel open for async response
})

// Export empty to make it a module
export {}