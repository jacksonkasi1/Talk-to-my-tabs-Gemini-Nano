// apps/extension/src/contents/display-settings.ts

// This content script automatically applies saved display settings to every page

// Theme definitions
const themes = {
  default: { backgroundColor: '', textColor: '' },
  cream: { backgroundColor: '#FDF6E3', textColor: '#5B4636' },
  dark: { backgroundColor: '#1a1a1b', textColor: '#E0E0E0' },
  sepia: { backgroundColor: '#F4ECD8', textColor: '#5B4636' }
}

// Apply theme function
function applyTheme(themeName: string) {
  const theme = themes[themeName as keyof typeof themes]
  if (!theme) return

  const { backgroundColor, textColor } = theme

  let themeStyle = document.getElementById('theme-style')
  if (!themeStyle) {
    themeStyle = document.createElement('style')
    themeStyle.id = 'theme-style'
    document.head.appendChild(themeStyle)
  }

  themeStyle.textContent = `
    html, body {
      background-color: ${backgroundColor} !important;
      color: ${textColor} !important;
    }
    body * {
      background-color: ${backgroundColor} !important;
      color: ${textColor} !important;
    }
  `
}

// Toggle OpenDyslexic font function
function toggleOpenDyslexicFont(enabled: boolean) {
  if (enabled) {
    // Add font-face definition if it doesn't exist
    if (!document.getElementById('opendyslexic-font-face')) {
      const fontFaceStyle = document.createElement('style')
      fontFaceStyle.id = 'opendyslexic-font-face'
      fontFaceStyle.textContent = `
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('${chrome.runtime.getURL('assets/fonts/OpenDyslexic-Regular.otf')}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `
      document.head.appendChild(fontFaceStyle)
    }

    // Create or update style element to apply font to entire page
    let fontStyle = document.getElementById('opendyslexic-font-style')
    if (!fontStyle) {
      fontStyle = document.createElement('style')
      fontStyle.id = 'opendyslexic-font-style'
      document.head.appendChild(fontStyle)
    }

    fontStyle.textContent = `
      body, body * {
        font-family: 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }
    `
  } else {
    // Remove the font style applied to the entire page
    const fontStyle = document.getElementById('opendyslexic-font-style')
    if (fontStyle && fontStyle.parentNode) {
      fontStyle.parentNode.removeChild(fontStyle)
    }

    // Optionally remove the font-face definition
    const fontFaceStyle = document.getElementById('opendyslexic-font-face')
    if (fontFaceStyle && fontFaceStyle.parentNode) {
      fontFaceStyle.parentNode.removeChild(fontFaceStyle)
    }
  }
}

// Apply spacing adjustments function
function applySpacingAdjustments(lineSpacing: number, letterSpacing: number, wordSpacing: number) {
  const existingStyle = document.getElementById('spacing-adjustments-style')
  if (existingStyle) {
    existingStyle.remove()
  }

  const style = document.createElement('style')
  style.id = 'spacing-adjustments-style'
  style.textContent = `
    body, body * {
      line-height: ${lineSpacing} !important;
      letter-spacing: ${letterSpacing}px !important;
      word-spacing: ${wordSpacing}px !important;
    }
  `
  document.head.appendChild(style)
}

// Apply display settings function
function applyDisplaySettings(settings: any) {
  // If display settings are disabled, remove all styling
  if (!settings.enabled) {
    removeAllDisplaySettings()
    return
  }

  // If settings are default values, remove all styling instead
  if (settings.pageTheme === 'default' &&
      !settings.useOpenDyslexic &&
      settings.lineSpacing === 1.4 &&
      settings.letterSpacing === 1 &&
      settings.wordSpacing === 0) {
    removeAllDisplaySettings()
    return
  }

  // Apply page theme
  if (settings.pageTheme && settings.pageTheme !== 'default' && themes[settings.pageTheme as keyof typeof themes]) {
    applyTheme(settings.pageTheme)
  } else {
    // Remove theme if default
    const themeStyle = document.getElementById('theme-style')
    if (themeStyle) {
      themeStyle.remove()
    }
  }

  // Apply OpenDyslexic font
  toggleOpenDyslexicFont(settings.useOpenDyslexic || false)

  // Apply spacing adjustments only if they're not default values
  if (settings.lineSpacing !== 1.4 || settings.letterSpacing !== 1 || settings.wordSpacing !== 0) {
    applySpacingAdjustments(
      settings.lineSpacing || 1.4,
      settings.letterSpacing || 1,
      settings.wordSpacing || 0
    )
  } else {
    // Remove spacing adjustments if default
    const spacingStyle = document.getElementById('spacing-adjustments-style')
    if (spacingStyle) {
      spacingStyle.remove()
    }
  }
}

// Remove all display settings function
function removeAllDisplaySettings() {
  // Remove theme style
  const themeStyle = document.getElementById('theme-style')
  if (themeStyle) {
    themeStyle.remove()
  }

  // Remove font style
  const fontStyle = document.getElementById('opendyslexic-font-style')
  if (fontStyle) {
    fontStyle.remove()
  }

  // Remove font face definition
  const fontFaceStyle = document.getElementById('opendyslexic-font-face')
  if (fontFaceStyle) {
    fontFaceStyle.remove()
  }

  // Remove spacing adjustments
  const spacingStyle = document.getElementById('spacing-adjustments-style')
  if (spacingStyle) {
    spacingStyle.remove()
  }
}

// Load and apply saved settings when page loads
function loadAndApplySettings() {
  chrome.storage.local.get(['displaySettings'], (result) => {
    if (result.displaySettings && result.displaySettings.enabled) {
      applyDisplaySettings(result.displaySettings)
    }
  })
}

// Apply settings when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndApplySettings)
} else {
  loadAndApplySettings()
}

// Make function available globally for popup to use
;(window as any).applyDisplaySettings = applyDisplaySettings

export {}