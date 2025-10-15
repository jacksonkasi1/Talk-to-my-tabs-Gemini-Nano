# Troubleshooting Guide

## System Restart Issue When Testing Chrome AI

### Problem
When clicking the "Test AI" button in the extension settings, the system may restart unexpectedly. This is a known issue with Chrome's Built-in AI API when called from extension contexts.

### Why This Happens
Chrome's Built-in AI (Gemini Nano) uses GPU acceleration and system-level resources. When the AI API is called from an extension context (like the settings page), it may trigger:
- GPU driver crashes
- Memory allocation issues
- System-level crashes (kernel panic on macOS, BSOD on Windows)

This happens because the extension runs in an isolated context that's different from regular webpage contexts.

### Solution 1: Test in Browser Console (Recommended)

Instead of using the extension's test button, test the Chrome AI API directly in the browser console:

1. **Open DevTools Console:**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (macOS)

2. **Run This Test Code:**
   ```javascript
   // Check if Chrome AI is available
   if (!('LanguageModel' in self)) {
     console.error('❌ LanguageModel API not available');
   } else {
     console.log('✅ LanguageModel API found!');
     
     // Check availability
     const status = await LanguageModel.availability();
     console.log('AI Status:', status);
     
     if (status === 'available') {
       // Create a test session
       const session = await LanguageModel.create({
         systemPrompt: 'You are a helpful assistant.',
         temperature: 0.7,
         topK: 3
       });
       
       // Test with a simple prompt
       const response = await session.prompt('Say hello');
       console.log('AI Response:', response);
       
       // Clean up
       session.destroy();
       console.log('✅ Test completed successfully!');
     } else {
       console.log('AI Status:', status);
       if (status === 'downloadable') {
         console.log('💡 Model needs to be downloaded. Creating a session will start the download.');
       } else if (status === 'downloading') {
         console.log('⏳ Model is currently downloading. Please wait...');
       }
     }
   }
   ```

3. **Expected Output:**
   ```
   ✅ LanguageModel API found!
   AI Status: available
   AI Response: Hello! How can I assist you today?
   ✅ Test completed successfully!
   ```

### Solution 2: Use the Extension Safely

If you still want to use the extension's test button, follow these precautions:

1. **Save Your Work:** Close all important applications and save your work before testing
2. **One Test at a Time:** Don't click the test button multiple times rapidly
3. **Wait for Results:** Give the test at least 30 seconds to complete
4. **Check Console:** Open DevTools console to monitor what's happening

### Solution 3: Disable Test Button (For Stability)

If the issue persists, you can temporarily disable the test button:

1. Open extension settings
2. Note the Chrome AI status message
3. If it says "Chrome AI Ready", the API is working - you don't need to test it
4. Proceed to use the extension features (they work even if the test button doesn't)

### Verify Chrome AI Setup

Before testing, ensure Chrome AI is properly set up:

1. **Check Chrome Version:**
   - Go to `chrome://version`
   - Ensure you're using Chrome Canary 138+

2. **Enable Required Flags:**
   - Go to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   - Set to "Enabled"
   - Go to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"
   - Restart Chrome

3. **Download AI Model:**
   - Go to `chrome://components`
   - Find "Optimization Guide On Device Model"
   - Click "Check for update"
   - Wait for download (requires ~22GB free space)
   - Status should show "Update successful"

4. **Verify Model is Ready:**
   - Go to `chrome://components`
   - Check that "Optimization Guide On Device Model" shows a version number
   - If it says "0.0.0.0", the model isn't downloaded yet

### Known Issues

1. **System Restart on Test:**
   - **Cause:** GPU driver crash or kernel panic
   - **Workaround:** Use browser console testing instead
   - **Status:** Chrome team is aware of this issue

2. **"LanguageModel is not defined":**
   - **Cause:** Chrome AI flags not enabled or model not downloaded
   - **Solution:** Follow setup instructions above

3. **Test Hangs/Freezes:**
   - **Cause:** Model downloading in background or GPU busy
   - **Solution:** Wait 1-2 minutes or restart Chrome

### Safe Usage Tips

1. **Use Extension Features Normally:**
   - The extension's main features (article simplification, chat) are safer than the test button
   - They use the same API but with better error handling

2. **Monitor System Resources:**
   - Chrome AI uses ~4-8GB RAM and GPU acceleration
   - Close other heavy applications before intensive AI use

3. **Report Issues:**
   - If you experience system crashes, report to Chrome team
   - GitHub: [Chrome Built-in AI Issues](https://github.com/GoogleChrome/chrome-ai/issues)

### Alternative Testing Method

Test individual features instead of the generic test:

1. **Test Article Simplification:**
   - Open any article webpage
   - Press `Ctrl+Shift+P`
   - Try simplifying a paragraph
   - If it works, Chrome AI is functional

2. **Test Chat Feature:**
   - Open any webpage
   - Press `Ctrl+Shift+Y`
   - Ask a simple question about the page
   - If you get a response, Chrome AI is working

### Getting Help

If you continue experiencing issues:

1. **Check Extension Console:**
   - Go to `chrome://extensions`
   - Click "Inspect views" under TalkToMyTabs
   - Look for error messages

2. **Report Issue:**
   - Open an issue on [GitHub](https://github.com/jacksonkasi1/TalkToMyTabs/issues)
   - Include:
     - Chrome version
     - Operating system
     - Error message from console
     - Steps that led to the crash

3. **Community Support:**
   - Join [GitHub Discussions](https://github.com/jacksonkasi1/TalkToMyTabs/discussions)
   - Ask questions and share workarounds

## Other Common Issues

### "Chrome AI Not Available"

**Cause:** System requirements not met

**Requirements:**
- Chrome Canary 138+
- macOS 13+ / Windows 10+ / Linux / ChromeOS
- 22GB free disk space
- 4GB+ VRAM (GPU)

**Solution:** Upgrade your system or use cloud-based AI instead

### Extension Features Not Working

**Cause:** Permissions or content script issues

**Solution:**
1. Go to `chrome://extensions`
2. Find TalkToMyTabs
3. Click "Details"
4. Ensure all permissions are enabled
5. Reload the extension

### Chat Sidebar Not Opening

**Cause:** Side panel API not available

**Solution:**
1. Ensure Chrome version 114+
2. Try the keyboard shortcut: `Ctrl+Shift+Y`
3. Check if other extensions conflict with the shortcut

---

**Need more help?** Open an issue on GitHub or join our discussions!
