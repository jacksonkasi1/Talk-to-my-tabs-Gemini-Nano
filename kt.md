# TalkToMyTabs - Project Knowledge Tree

## 🎯 **Core Project Vision**
**Transform passive bookmark hoarding into active learning through AI-powered article conversations with semantic search capabilities**

***

## 🏗️ **Technical Architecture**

### 🎨 **Frontend (Plasmo Framework)**
- **React + TypeScript:** Modern component-based UI development
- **Tailwind CSS:** Utility-first styling for rapid UI development
- **Chrome Extension APIs:** Native browser integration and permissions
- **Real-time State Management:** Context API for cross-component data flow

### ⚙️ **Backend (Heroku Infrastructure)**
- **Heroku Postgres + pgvector:** Vector database for semantic article search
- **Heroku Managed Inference:** Claude AI models for intelligent conversations  
- **REST API Endpoints:** Article CRUD, chat, and recommendation services
- **Embedding Pipeline:** Cohere embeddings for article vectorization

***

## 📱 **Core User Experience**

### 🏠 **New Tab Dashboard**
- **Article Feed:** Pinterest-style card grid showing saved articles
- **Smart Categories:** Unread/Read tabs with real-time counters
- **Visual States:** Different card styling for read vs unread status
- **Quick Actions:** One-click mark as read, delete, or open chat
- **Empty State:** Onboarding guidance for new users

### 🌐 **Article Page Integration** 
- **Floating Buttons:** Non-intrusive chat and bookmark buttons on any article
- **Smart Detection:** Auto-detect article content vs navigation pages
- **One-Click Save:** Instant bookmarking without interrupting reading flow
- **Context Extraction:** Automatic title, content, and metadata capture

### 💬 **Side Panel Chat System**
- **Persistent Interface:** Chat stays open while browsing other tabs
- **Article Context:** AI knows exactly which article you're discussing
- **Conversation Memory:** Chat history persists across browser sessions
- **Smart Questions:** AI generates relevant questions about article content

***

## 🤖 **AI-Powered Features**

### 🧠 **Semantic Understanding**
- **pgvector Integration:** Store article embeddings for similarity search
- **Content Analysis:** Extract key topics and concepts from articles
- **Smart Recommendations:** "Articles like this" based on semantic similarity
- **Topic Clustering:** Auto-organize articles by subject matter

### 💭 **Intelligent Conversations**
- **Context-Aware Responses:** AI understands the specific article being discussed
- **Multi-Turn Dialogue:** Maintain conversation context across multiple exchanges  
- **Question Generation:** AI asks probing questions to deepen understanding
- **Learning Assessment:** AI adapts difficulty based on user responses

### 🔍 **Advanced Search & Discovery**
- **Semantic Search:** Find articles by meaning, not just keywords
- **Related Content:** Discover connections between different articles
- **Reading Insights:** Track learning progress and knowledge gaps
- **Personalized Feed:** AI-curated article suggestions based on interests

***

## 🔄 **Data Flow Architecture**

### 📥 **Article Ingestion Pipeline**
- **Content Script Extraction:** Capture article data from any webpage
- **Content Cleaning:** Remove ads, navigation, and irrelevant content
- **Metadata Enrichment:** Extract title, description, author, publication date
- **Embedding Generation:** Convert content to vectors using Cohere API
- **Database Storage:** Store in Heroku Postgres with pgvector indexing

### 🔄 **Real-Time Synchronization**
- **Cross-Tab Updates:** Changes reflect immediately across all browser tabs
- **Offline Capabilities:** Local storage cache for offline article access
- **Conflict Resolution:** Handle concurrent edits across multiple tabs
- **Data Consistency:** Ensure read states sync between extension and backend

***

## 🎪 **User Journey Flows**

### 🆕 **New User Onboarding**
1. Install extension → See welcome message in new tab
2. Browse to any article → Notice floating chat/bookmark buttons
3. Click "Chat" → Article auto-saves, side panel opens with AI greeting
4. Ask question → Experience intelligent conversation about article
5. Open new tab → See saved article in dashboard feed

### 📚 **Daily Reading Workflow**
1. Open new tab → See personalized article feed dashboard
2. Click unread article card → Open summary modal with key insights
3. Start chat → Dive deeper into concepts through AI conversation
4. Mark as read → Article moves to "Read" section
5. Get recommendations → Discover related articles via semantic search

### 🔍 **Research & Learning Flow**
1. Save multiple articles on similar topics → AI detects content clusters
2. Use semantic search → Find connections across saved articles
3. Chat with AI → Synthesize insights from multiple sources
4. Export learnings → Generate summary of key takeaways
5. Track progress → See learning analytics and knowledge growth
