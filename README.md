# AI Long-Form Writing Assistant

<div align="center">

**An intelligent workspace for crafting long-form fiction with consistent world-building and character development**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-19.2-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

This project addresses a fundamental challenge in AI-assisted long-form writing: **maintaining consistency across hundreds of thousands of words**. Traditional LLM approaches suffer from "setting amnesia" where characters, world rules, and plot details become inconsistent over time.

Our solution combines **multi-agent orchestration**, **temporal RAG (Retrieval-Augmented Generation)**, and **version-controlled knowledge bases** to create a writing assistant that truly understands your story's timeline and evolution.

### The Problem

- **Setting Collapse**: LLMs forget character attributes, world rules, and plot points in long narratives
- **Context Limitations**: Even with 128k+ token windows, selectively managing relevant context remains challenging
- **Creative Overhead**: Authors spend more time cross-referencing notes than writing

### Our Approach

- **Project-Level Memory**: Structured knowledge base with chapter-aware versioning
- **Temporal Consistency**: RAG retrieval filtered by story timeline (Chapter 1-N)
- **Multi-Agent Workflow**: Specialized agents for world-building, character development, plotting, and writing
- **Immersive Interface**: Context-aware workspace that surfaces relevant lore automatically

---

## ✨ Features

### 🎯 Genesis Wizard
Guided project creation flow that transforms vague ideas into structured foundations:
- **Skeleton Agent**: Story formula, golden finger rules, emotional tone
- **Character Agent**: Multi-dimensional character cards with relationship graphs
- **World Agent**: Power systems, factions, economy, and hidden lore layers
- **Outline Agent**: Volume-chapter hierarchy with foreshadowing tracking
- **First Chapter Agent**: Opening scene generation following hook principles

### 📝 Studio Workspace
Immersive writing environment with intelligent context management:
- **Outline Navigator**: Hierarchical chapter/volume view with progress tracking
- **Smart Editor**: AI-powered drafting, continuation, and refinement
- **Context Panel**: Auto-surfaced relevant character cards, world rules, and timeline events
- **Copilot Chat**: Conversational assistant with project-aware responses

### 🧠 Temporal RAG System
Chapter-aware knowledge retrieval ensuring consistency:
- **Versioned Entities**: Characters, locations, and factions track state changes across chapters
- **Event Timeline**: Story events with participant/witness tracking
- **Smart Retrieval**: Filters knowledge by `valid_from_chapter` and `valid_to_chapter`
- **Hybrid Search**: Combines vector similarity with structured metadata filtering

### 🔍 Inspiration Search
External knowledge integration via MCP (Model Context Protocol):
- Tavily-powered web search for genre research and naming inspiration
- Title suggestion pipeline: Analysis → Market Research → Synthesis
- Graceful degradation when search services unavailable

---

## 🏗 Architecture

### Technology Stack

**Backend**
- **FastAPI** - Async API framework with SSE streaming
- **LangGraph** - Multi-agent workflow orchestration
- **PostgreSQL + pgvector** - Hybrid storage (relational + vector embeddings)
- **LangChain** - LLM integration and tooling
- **MCP** - Standardized tool/service encapsulation

**Frontend**
- **React 19** - UI framework
- **Vite** - Build tooling
- **TypeScript** - Type-safe development
- **Lucide React** - Icon system

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Genesis Wizard│  │    Studio    │  │     Wiki     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   FastAPI     │
                    │   Routers     │
                    └───────┬───────┘
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
    │LangGraph│      │RAG Service  │   │MCP Services │
    │ Agents  │      │             │   │             │
    └────┬────┘      └──────┬──────┘   └──────┬──────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │  PostgreSQL + pgvector    │
              │  ┌─────────────────────┐  │
              │  │ Projects & Chapters │  │
              │  │  Entity Versions    │  │
              │  │     Embeddings      │  │
              │  └─────────────────────┘  │
              └───────────────────────────┘
```

### Multi-Agent Collaboration

The system orchestrates specialized agents via LangGraph state machines:

1. **Router Agent** → Analyzes user input, determines required modules
2. **Skeleton Agent** → Extracts story formula and core hooks
3. **Character Agents** → Generates protagonist/antagonist profiles
4. **World Agent** → Builds power systems, factions, and lore
5. **Outline Agent** → Creates volume-chapter structure with foreshadowing
6. **Finalizer Agent** → Consolidates outputs for user presentation

Each agent maintains clean separation of concerns while sharing state through `GenesisState`.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Docker & Docker Compose**
- API Keys:
  - OpenAI-compatible LLM endpoint (e.g., DeepSeek, OpenAI)
  - Tavily API key (for web search features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-long-form-writing-assistant.git
   cd ai-long-form-writing-assistant
   ```

2. **Start PostgreSQL with pgvector**
   ```bash
   cd back-end
   docker-compose up -d
   ```

3. **Configure backend environment**
   ```bash
   cd back-end
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

   Required environment variables:
   ```ini
   # Database
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/novel_assist
   
   # LLM Service
   OPENAI_API_KEY=your-api-key
   LLM_BASE_URL=https://api.deepseek.com  # or your provider
   
   # Embeddings
   EMBEDDING_API_KEY=your-embedding-key
   EMBEDDING_BASE_URL=https://api.openai.com/v1
   
   # External Tools
   TAVILY_API_KEY=your-tavily-key
   ```

4. **Install backend dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Initialize database**
   ```bash
   python -m app.db.init_db
   ```

6. **Start backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Install and run frontend**
   ```bash
   cd ../front-end
   npm install
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[项目介绍.md](docs/项目介绍.md)** - Detailed project overview (Chinese)
- **[agents_collaboration.md](docs/agents_collaboration.md)** - Multi-agent architecture deep dive
- **[RAG策略.md](docs/RAG策略.md)** - Temporal RAG implementation strategy
- **[需求说明书.md](docs/需求说明书.md)** - Product requirements specification
- **[portfolio-description.md](docs/portfolio-description.md)** - Portfolio showcase

### Key Concepts

#### Temporal Entity Versioning
```python
# Example: Character evolution across chapters
EntityVersion(
    project_id=uuid("project-123"),
    entity_type="character",
    entity_id="protagonist_alice",
    version=2,
    valid_from_chapter=15,  # After awakening event
    valid_to_chapter=None,   # Current version
    is_current=True,
    payload_json={
        "name": "Alice",
        "abilities": ["dragon_rider", "fire_magic"],
        "status": "Awakened Dragon Rider"
    }
)
```

#### Chapter-Aware RAG Retrieval
```python
# Retrieves only knowledge valid at Chapter 20
relevant_entities = await rag_service.retrieve_context(
    project_id=project_id,
    query="Alice confronts the Dark Council",
    current_chapter=20,
    limit=10
)
# Filters: valid_from <= 20 AND (valid_to IS NULL OR valid_to >= 20)
```

---

## 🗂 Project Structure

```
ai-long-form-writing-assistant/
├── back-end/
│   ├── app/
│   │   ├── agents/           # LangGraph workflow definitions
│   │   │   ├── graph.py      # Agent orchestration
│   │   │   ├── nodes.py      # Individual agent implementations
│   │   │   └── state.py      # Shared state schemas
│   │   ├── routers/          # FastAPI route handlers
│   │   │   ├── genesis.py    # Project creation endpoints
│   │   │   ├── chat.py       # Writing assistant chat
│   │   │   └── chapters.py   # Chapter management
│   │   ├── services/         # Business logic layer
│   │   │   ├── rag_service.py        # Vector retrieval
│   │   │   ├── analysis_service.py   # Content analysis
│   │   │   └── llm_service.py        # LLM interactions
│   │   └── db/               # Database models & migrations
│   ├── mcp_server/           # MCP tool servers
│   │   └── tavily_server.py  # Web search integration
│   ├── prompts/              # System prompts by module
│   │   └── genesis/          # Creation wizard prompts
│   ├── requirements.txt
│   └── docker-compose.yml
├── front-end/
│   ├── components/           # React components
│   │   ├── GenesisWizard.tsx # Project creation UI
│   │   ├── Studio.tsx        # Main writing interface
│   │   └── Wiki.tsx          # Knowledge base viewer
│   ├── api.ts                # Backend API client
│   ├── types.ts              # TypeScript definitions
│   └── package.json
└── docs/                     # Documentation
```

---

## 🛠 Development

### Running Tests
```bash
# Backend tests
cd back-end
pytest

# Frontend tests
cd front-end
npm test
```

### Database Migrations
```bash
# Apply schema changes
python -m app.db.init_db
```

### Code Quality
```bash
# Python linting
ruff check .
black .

# TypeScript linting
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Priorities

- [ ] Enhanced conflict detection (plot hole identification)
- [ ] Multi-user collaboration support
- [ ] Export to EPUB/PDF formats
- [ ] Voice-to-text drafting integration
- [ ] Advanced analytics (pacing, sentiment arcs)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **LangChain** and **LangGraph** communities for agent orchestration frameworks
- **pgvector** team for enabling hybrid retrieval patterns
- **Anthropic** for MCP (Model Context Protocol) standardization
- **Tavily** for semantic web search capabilities

---

## 📧 Contact

For questions, suggestions, or collaboration inquiries:

- **Project Issues**: [GitHub Issues](https://github.com/yourusername/ai-long-form-writing-assistant/issues)
- **Documentation**: [docs/](docs/)
- **Portfolio**: [docs/portfolio-description.md](docs/portfolio-description.md)

---

<div align="center">

**Built with ❤️ for writers who dream big**

</div>
