# 🧠 TalkToMyTabs - AI-Powered Reading Assistant

> *An AI-powered Chrome extension that solves the "save but never read" syndrome plaguing every student's learning journey.*

**Powered by Chrome Built-in AI (Gemini Nano)** - Privacy-first, on-device AI processing

## 🎥 Demo Video

[![TalkToMyTabs Demo](https://img.youtube.com/vi/BNOHgRX1QJY/maxresdefault.jpg)](https://youtu.be/BNOHgRX1QJY)

*Click the image above to watch the full demo on YouTube*

## 🔗 Quick Links

- 🌐 **Demo**: [YouTube Video](https://youtu.be/JB4rcXm1GLA)
- 🚀 **Download**: [Latest Release](https://github.com/jacksonkasi1/TalkToMyTabs/releases/latest)
- 🐛 **Issues**: [GitHub Issues](https://github.com/jacksonkasi1/TalkToMyTabs/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jacksonkasi1/TalkToMyTabs/discussions)

---

## 🎯 The Problem We Solve

We've all been there: You find an amazing research paper, a crucial tutorial, or an insightful article. You bookmark it thinking "I'll read this later"... but later never comes. Your bookmarks become a graveyard of good intentions.

**TalkToMyTabs** transforms this broken workflow into an active learning system.

## ✨ Key Features

### 🧠 **Smart Article Simplification**
- Automatically simplifies and saves articles when you bookmark them
- Three simplification levels (Low/Mid/High) based on your comprehension needs
- Preserves core concepts while making content digestible

### 📚 **Force-Fed Learning** (in a good way!)
- Saved articles appear as cards every time you open a new tab
- One-minute quick-read versions that maintain the essence
- To-do style checkboxes create a sense of accomplishment
- Arrow navigation for seamless article-to-article reading flow

### 💬 **Context-Aware AI Assistant**
- Side panel chat that understands the current webpage
- Ask questions, get clarifications, or dive deeper into topics
- Perfect for research and study sessions

### ♿ **Accessibility First**
- **OpenDyslexic font** support for students with dyslexia
- Four reading themes (Default, Cream Paper, Dark Mode, Sepia)
- Customizable spacing (line, letter, word) for optimal readability
- Makes ANY website accessible, not just saved articles

## 🚀 Quick Start

### Installation

1. **Download the latest release:**
   ```bash
   # Download from GitHub Releases
   curl -L https://github.com/jacksonkasi1/TalkToMyTabs/releases/latest/download/TalkToMyTabs-v0.0.1.zip -o TalkToMyTabs.zip
   ```

2. **Install in Chrome:**
   - Extract the ZIP file to a folder
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extracted folder
   - The extension is now installed and ready to use!

### Setup

1. **Setup Chrome AI:**
   - Download Chrome Canary (version 138+)
   - Enable Built-in AI flags at chrome://flags
   - Download AI model at chrome://components
   - No API keys or external services required!

2. **Start Saving Articles:**
   - Use keyboard shortcut `Ctrl+Shift+P` to open article simplifier
   - Or use the floating action button on any webpage
   - Articles automatically appear in your new tab dashboard

3. **Chat with Webpages:**
   - Use `Ctrl+Shift+Y` to open the AI chat sidebar
   - Ask questions about the current webpage
   - Get instant clarifications and deeper insights

## 🏗️ Development Setup

This is a **Turborepo monorepo** built with:
- **Chrome Extension**: Plasmo + TypeScript + React
- **AI Backend**: Chrome Built-in AI (Gemini Nano)
- **Build System**: Turbo + Bun

### Prerequisites

- [Bun](https://bun.sh) v1.2.20+
- [Git](https://git-scm.com)
- Chrome browser for testing

### Installation

```bash
# Clone the repository
git clone https://github.com/jacksonkasi1/TalkToMyTabs.git
cd TalkToMyTabs

# Install dependencies
bun install

# Start development
bun run dev
```

### Project Structure

```
TalkToMyTabs/
├── apps/
│   └── extension/           # Chrome extension (Plasmo)
│       ├── src/
│       │   ├── popup.tsx    # Main popup interface
│       │   ├── sidepanel.tsx # AI chat sidebar
│       │   ├── newtab.tsx   # Article dashboard
│       │   └── contents/    # Content scripts
│       ├── package.json     # Extension configuration
│       └── manifest.json    # Chrome extension manifest
├── .github/
│   └── workflows/
│       └── extension-release.yml # Automated CI/CD
├── turbo.json              # Turborepo configuration
└── package.json           # Root configuration
```

### Available Scripts

```bash
# Development
bun run dev                 # Start development server
bun run build              # Build all projects
bun run build:extension    # Build extension only

# Quality
bun run lint               # Run ESLint
bun run check-types        # TypeScript type checking
bun run format             # Format code with Prettier

# Release Management
bun run release:patch      # Bump patch version (0.0.1 → 0.0.2)
bun run release:minor      # Bump minor version (0.0.1 → 0.1.0)
bun run release:major      # Bump major version (0.0.1 → 1.0.0)
```

## 🤖 AI Integration

### Chrome Built-in AI (Gemini Nano)

The extension leverages **Chrome's Built-in AI APIs** for privacy-first, on-device processing:

#### 1. **Prompt API** for Chat & Content Generation
```typescript
// Create AI session
const session = await window.ai.languageModel.create({
  systemPrompt: 'You are a helpful assistant',
  temperature: 0.7,
  topK: 3
})

// Generate response
const result = await session.prompt('Your question here')
```

#### 2. **Summarizer API** for Article Simplification
```typescript
// Create summarizer
const summarizer = await window.ai.summarizer.create({
  type: 'key-points',
  format: 'markdown',
  length: 'medium'
})

// Summarize content
const summary = await summarizer.summarize(articleContent)
```

### Key Benefits

- **🔒 Privacy-First**: All AI processing happens on-device
- **⚡ Fast**: No network latency for API calls
- **💰 Free**: No API keys or subscription required
- **🌐 Offline**: Works without internet connection

## 🏃‍♂️ Usage

### Keyboard Shortcuts

- `Ctrl+Shift+Y` - Open AI chat sidebar
- `Ctrl+Shift+P` - Open article simplifier popup
- `←/→` - Navigate between articles in reading mode
- `Escape` - Close current interface

### Workflow

1. **Discover** content while browsing
2. **Simplify** using the popup or floating button
3. **Review** articles in your new tab dashboard
4. **Learn** with the AI chat assistant
5. **Track** progress with completion checkboxes

## 🎨 Customization

### Accessibility Options

- **Font**: OpenDyslexic for dyslexia support
- **Themes**: Default, Cream Paper, Dark Mode, Sepia
- **Spacing**: Adjustable line, letter, and word spacing
- **Size**: Configurable font sizes

### AI Configuration

- **Model Selection**: Choose based on budget and needs
- **Simplification Levels**: Low/Mid/High complexity
- **Processing Limits**: Token-aware content handling

## 📊 Automated Releases

The project uses **GitHub Actions** for automated CI/CD:

### Trigger Conditions
- **Builds**: Any code changes in `apps/` or `packages/`
- **Releases**: Only when `apps/extension/` code changes
- **Excludes**: Documentation (`.md`) files

### Release Process
1. Code is pushed to `main` branch
2. GitHub Actions builds and tests the extension
3. Creates a new release with versioned ZIP file
4. Users can download from [Releases page](https://github.com/jacksonkasi1/TalkToMyTabs/releases)

## 🛠️ Technical Architecture

### Chrome Extension (Plasmo Framework)
```
Content Scripts → Background Service Worker → Chrome Built-in AI (Gemini Nano)
       ↓                     ↓                      ↓
 Floating Button    Storage Management    On-Device AI Processing
   Side Panel       Message Routing      Summarization & Chat
   New Tab Page     Settings Sync        Content Generation
```

### Key Technologies

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Extension**: Plasmo, Chrome APIs, Zustand
- **AI**: Chrome Built-in AI (Gemini Nano)
- **Build**: Turborepo, Bun, ESLint, Prettier
- **CI/CD**: GitHub Actions, Automated Releases

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Run quality checks**: `bun run lint && bun run check-types`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use conventional commits
- Ensure all CI checks pass

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🎊 Acknowledgments

- **Chrome Built-in AI Team** for making on-device AI accessible
- **Plasmo Framework** for excellent Chrome extension development
- **OpenDyslexic Font** for accessibility support
- **Open Source Community** for inspiration and support


---

**Built with 💙 for students who save everything but read nothing**

*Transform your reading workflow from passive saving to active learning with AI-powered assistance.*
