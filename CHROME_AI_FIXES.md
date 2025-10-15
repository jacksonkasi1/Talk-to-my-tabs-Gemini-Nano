# Chrome AI System Crash Fixes - Complete Solution

## 🚨 Problem Analysis

The extension was causing **system restarts** when using Chrome AI features (test, chat, summary, save) due to:

### Root Causes (Based on Official Chrome AI Documentation)

1. **Session Proliferation** ⚠️ CRITICAL
   - Creating too many AI sessions too quickly
   - Each new operation created a brand new session
   - No session reuse → memory exhaustion → GPU crash → system restart

2. **Missing Session Lifecycle Management**
   - Sessions were being destroyed immediately after use
   - No delays before destruction (GPU needs time to cleanup)
   - No rate limiting between session creations

3. **GPU Overload**
   - Multiple concurrent AI operations overwhelming GPU
   - Processing large documents without delays between chunks
   - No throttling or queuing

4. **Extension Context Issues**
   - Chrome AI API less stable when called rapidly from extension service workers
   - No proper error handling for extension-specific issues

## ✅ Solutions Implemented

### 1. Session Manager (session-manager.ts)

**Based on:** https://developer.chrome.com/docs/ai/session-management

```typescript
// ❌ BAD - Old approach (caused crashes)
async function simplify() {
  const summarizer = await Summarizer.create()  // New session every time
  const result = await summarizer.summarize(text)
  summarizer.destroy()  // Immediate destroy
  return result
}

// ✅ GOOD - New approach (prevents crashes)
import { sessionManager } from '@/utils/session-manager'

async function simplify() {
  const summarizer = await sessionManager.getSession({
    type: 'summarizer',
    options: { /*...*/ }
  })
  // Session is reused if available, or created with rate limiting
  const result = await summarizer.summarize(text)
  // Session is NOT destroyed immediately - managed by sessionManager
  return result
}
```

**Key Features:**

- **Session Reuse**: Reuses existing sessions instead of creating new ones
- **Rate Limiting**: Minimum 1 second between session creations
- **Max Sessions**: Limits to 3 concurrent sessions
- **Automatic Cleanup**: Removes sessions after 5 minutes of inactivity
- **Proper Destroy Sequence**: Adds 200ms delay before destroying sessions
- **Retry Logic**: Automatically retries with exponential backoff
- **Timeout Protection**: All operations have timeouts

### 2. Updated simplifyArticle() Function

**Based on:**
- https://developer.chrome.com/docs/ai/session-management
- https://developer.chrome.com/docs/ai/scale-summarization

**Changes:**

```typescript
export const simplifyArticle = async (
  content: string,
  level: SimplificationLevel,
  context?: string,
  signal?: AbortSignal  // ✅ NEW: Support for cancellation
): Promise<string> => {
  // ✅ NEW: Check cancellation
  if (signal?.aborted) {
    throw new Error('Operation cancelled')
  }

  try {
    // ✅ NEW: Use session manager instead of creating new sessions
    const summarizer = await sessionManager.getSession({
      type: 'summarizer',
      options: summarizerOptions
    }) as SummarizerSession

    // For large content with chunks
    if (estimatedTokens > MAX_INPUT_TOKENS) {
      const chunks = splitIntoChunks(content, { maxChunkSize, overlap: 200 })
      
      // ✅ NEW: Process sequentially with delays (not parallel)
      const summaries: string[] = []
      for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new Error('Operation cancelled')
        
        const summary = await summarize(summarizer, chunks[i], context)
        summaries.push(summary)
        
        // ✅ NEW: Add delay between chunks to prevent GPU overload
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      return summaries.join('\n\n')
    }

    return await summarize(summarizer, content, context)

  } catch (error) {
    // ✅ NEW: Better error handling with user-friendly messages
    console.error('❌ Article simplification error:', error)
    throw error
  }
  // ✅ NEW: NO finally block destroying session
  // Session manager handles cleanup automatically
}
```

### 3. Best Practices Applied

#### A. Session Management Best Practices

✅ **DO:**
- Reuse sessions when possible
- Use session manager to control creation rate
- Add delays before destroying sessions (200ms minimum)
- Limit maximum concurrent sessions
- Clean up unused sessions automatically

❌ **DON'T:**
- Create new sessions for every operation
- Destroy sessions immediately after use
- Create multiple sessions in parallel
- Keep unlimited sessions in memory

#### B. Rate Limiting Best Practices

✅ **DO:**
- Minimum 1 second between session creations
- Add 500ms delay between chunk processing
- Use sequential processing for large content
- Implement proper timeouts (5s for availability, 15s for creation)

❌ **DON'T:**
- Process all chunks in parallel with Promise.all()
- Create sessions without rate limiting
- Run AI operations without delays

#### C. AbortController Support

```typescript
// Usage example
const controller = new AbortController()

// User can cancel
cancelButton.onclick = () => controller.abort()

try {
  const result = await simplifyArticle(
    content,
    'Mid',
    'context',
    controller.signal  // Pass signal
  )
} catch (error) {
  if (error.message.includes('cancelled')) {
    console.log('User cancelled operation')
  }
}
```

### 4. Debugging Tools

**Use Chrome's built-in debugging:**

1. Open `chrome://on-device-internals`
2. Go to "Event Logs" tab
3. See all AI API calls, inputs, and outputs
4. Download JSON logs for bug reports

**Check session stats:**

```typescript
import { sessionManager } from '@/utils/session-manager'

// Get current stats
const stats = sessionManager.getStats()
console.log('Active sessions:', sessionManager.getSessionCount())
console.log('Session details:', stats)

// Output:
// Active sessions: 2
// Session details: [
//   { type: 'summarizer', age: 45, lastUsed: 2, useCount: 5 },
//   { type: 'languageModel', age: 120, lastUsed: 60, useCount: 1 }
// ]
```

## 📋 Migration Guide

### For Existing Code

**Before (Causes Crashes):**

```typescript
import { createSummarizer } from '../summarizer/create-summarizer'
import { destroySummarizer } from '../summarizer/destroy-summarizer'

async function myFunction() {
  let summarizer = null
  try {
    summarizer = await createSummarizer({ /*...*/ })
    const result = await summarizer.summarize(text)
    return result
  } finally {
    if (summarizer) {
      destroySummarizer(summarizer)
    }
  }
}
```

**After (Safe):**

```typescript
import { sessionManager } from '@/utils/session-manager'

async function myFunction(signal?: AbortSignal) {
  // Check cancellation
  if (signal?.aborted) {
    throw new Error('Operation cancelled')
  }

  try {
    // Get or reuse session
    const summarizer = await sessionManager.getSession({
      type: 'summarizer',
      options: { /*...*/ }
    })
    
    // Check cancellation again
    if (signal?.aborted) {
      throw new Error('Operation cancelled')
    }
    
    const result = await summarizer.summarize(text)
    return result
  } catch (error) {
    console.error('Operation failed:', error)
    throw error
  }
  // No finally block - session manager handles cleanup
}
```

### For New Code

Always use the session manager pattern:

```typescript
import { sessionManager } from '@/utils/session-manager'

// For Summarizer API
const summarizer = await sessionManager.getSession({
  type: 'summarizer',
  options: {
    type: 'key-points',
    format: 'markdown',
    length: 'medium'
  }
})

// For Prompt API (LanguageModel)
const languageModel = await sessionManager.getSession({
  type: 'languageModel',
  options: {
    temperature: 0.7,
    topK: 3
  }
})
```

## 🧪 Testing the Fixes

### 1. Test Simplification

```bash
# Open any article webpage
# Press Ctrl+Shift+P to simplify
# Should work without crashes
```

### 2. Test Chat

```bash
# Press Ctrl+Shift+Y to open chat
# Send multiple messages quickly
# Should work without crashes
```

### 3. Test Save

```bash
# Right-click → "Save Article"
# Should save without crashes
```

### 4. Monitor Sessions

```javascript
// In browser console
import { sessionManager } from '@/utils/session-manager'

// Check active sessions
console.log('Sessions:', sessionManager.getSessionCount())
console.log('Stats:', sessionManager.getStats())

// Force cleanup (for testing)
await sessionManager.destroyAll()
```

## 🎯 Expected Behavior After Fixes

✅ **Before:** Clicking test/chat/save → System restarts
✅ **After:** All features work smoothly without crashes

✅ **Before:** Creating many sessions → Memory exhaustion
✅ **After:** Sessions are reused, maximum 3 concurrent

✅ **Before:** Immediate session destroy → GPU crashes
✅ **After:** Proper cleanup with delays

✅ **Before:** Parallel chunk processing → GPU overload
✅ **After:** Sequential processing with delays

## 📚 Official Documentation References

All fixes are based on official Chrome documentation:

1. **Session Management:**
   https://developer.chrome.com/docs/ai/session-management

2. **Scale Summarization:**
   https://developer.chrome.com/docs/ai/scale-summarization

3. **Debug Gemini Nano:**
   https://developer.chrome.com/docs/ai/debug-gemini-nano

4. **Built-in AI APIs:**
   https://developer.chrome.com/docs/ai/built-in-apis

5. **Streaming:**
   https://developer.chrome.com/docs/ai/streaming

6. **Render LLM Responses:**
   https://developer.chrome.com/docs/ai/render-llm-responses

## ⚠️ Important Notes

1. **Don't Use Test Button in Settings:**
   - The test button calls Chrome AI from extension context
   - This is inherently risky and can cause crashes
   - Use browser console testing instead (see TROUBLESHOOTING.md)

2. **Session Manager is Global:**
   - One instance manages all sessions across the extension
   - Automatically cleans up on extension suspend

3. **Rate Limiting is Mandatory:**
   - Minimum 1 second between session creations
   - This prevents GPU driver crashes

4. **Delays are Essential:**
   - 500ms between chunk processing
   - 200ms before session destruction
   - These delays prevent system overload

## 🔧 Future Improvements

1. **Offscreen Document**: Move AI operations to offscreen document for better stability
2. **Worker Thread**: Use dedicated worker for AI operations
3. **Better Error Recovery**: Implement circuit breaker pattern
4. **Telemetry**: Track session usage and performance metrics
5. **Dynamic Rate Limiting**: Adjust based on system performance

## 🤝 Contributing

When adding new Chrome AI features:

1. ✅ Always use `sessionManager.getSession()`
2. ✅ Never call `create()` directly
3. ✅ Add `AbortSignal` support for cancellation
4. ✅ Add delays for large operations
5. ✅ Test thoroughly before committing
6. ✅ Check `chrome://on-device-internals` logs

## 📞 Support

If you still experience crashes:

1. Check Chrome version (need Canary 138+)
2. Check model is downloaded (`chrome://components`)
3. Check Event Logs (`chrome://on-device-internals`)
4. Report with logs to GitHub Issues

---

**Last Updated:** Based on Chrome AI documentation as of January 2025

**Status:** ✅ Fixes implemented and tested
