# Frontend Guide & Integration Documentation

## Overview
The frontend is a React + Vite application designed to provide a seamless writing experience with AI assistance. It connects to the FastAPI backend for inspiration, chat generation, and RAG context retrieval.

## Directory Structure
- `front-end/App.tsx`: Main router and layout.
- `front-end/api.ts`: Centralized API client for backend communication.
- `front-end/components/`:
    - `GenesisWizard.tsx`: Project creation wizard using AI inspiration.
    - `Studio.tsx`: Main writing interface with Copilot and Context awareness.
    - `Wiki.tsx`: Entity management and timeline view.

## Pages & Features

### 1. Genesis Wizard
**Purpose**: Helps users brainstorm and set up a new novel project.
**Integration**:
- **Inspiration**: Calls `POST /api/inspiration` to fetch ideas based on user input (e.g., "Cyberpunk Xianxia").
- **Blueprint Generation**: Calls `POST /api/chat/generate` to structure the project (Title, Genre, Theme, Protagonist, World) into JSON format.
- **Flow**:
    1. User enters concept.
    2. AI suggests Title/Genre/Theme.
    3. AI generates Protagonist.
    4. AI generates World Setting.
    5. Project is initialized (mock transition to Studio).

### 2. Studio (The Writing Interface)
**Purpose**: The core writing environment.
**Integration**:
- **AI Autocomplete (Ghost Text)**:
    - Triggered when the user stops typing.
    - Calls `POST /api/chat/generate` with the last 500 characters of context.
    - Suggests the next sentence.
- **Context Awareness (RAG)**:
    - Triggered by cursor movement/selection.
    - Calls `POST /api/context/retrieve` with the text around the cursor.
    - Displays relevant entity info (from Vector DB) in the "Context" tab.
- **Copilot Chat**:
    - Sidebar chat interface.
    - Calls `POST /api/chat/generate` (streaming) to answer questions or draft content based on the current chapter.

### 3. Chrono-Wiki
**Purpose**: Visualizes entities (Characters, Locations) across the timeline.
**Integration**:
- Currently uses mock data (`WIKI_ENTITIES`) for visualization.
- **Future Work**: Connect to `POST /api/entities/update` to save changes and a new endpoint to fetch all entities.

## Backend Integration Details

### API Client (`front-end/api.ts`)
The frontend uses a typed API client to communicate with the backend at `http://localhost:8000/api`.

| Function              | Endpoint            | Description                             |
| --------------------- | ------------------- | --------------------------------------- |
| `api.inspiration`     | `/inspiration`      | Fetches web-based inspiration (Tavily). |
| `api.chat`            | `/chat/generate`    | Handles LLM generation (Streaming).     |
| `api.retrieveContext` | `/context/retrieve` | Performs RAG search for entities.       |
| `api.updateEntity`    | `/entities/update`  | Updates/Creates entity versions.        |

### Running the Frontend
1. Navigate to `front-end/`.
2. Install dependencies: `npm install`.
3. Start dev server: `npm run dev`.
4. Open `http://localhost:5173`.

### Troubleshooting
- **CORS Errors**: Ensure backend `app/main.py` has `allow_origins=["*"]`.
- **API Errors**: Check the browser console and backend logs (`uvicorn`).
- **Missing Data**: Ensure the database is initialized (`python -m app.db.init_db`) and has data.
