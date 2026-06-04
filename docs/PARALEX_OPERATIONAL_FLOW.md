# Paralex Operational Flow

Paralex is a React + Express AI assistant that combines a polished chat interface, Supabase authentication, user profile persistence, long-term memory, and OpenRouter-compatible model streaming. The system is designed around a fast linear response path, with heavier personalization and memory work running in the background so the user sees answers quickly.

## High Level System

Paralex has four main layers:

1. **Frontend application**
   - React 19 + Vite.
   - Routes are managed with `react-router-dom`.
   - Chat state and settings are stored locally with React context and Zustand.
   - GitHub OAuth is handled through Supabase Auth.

2. **Backend application**
   - Express server in `server.ts`.
   - Serves API routes and runs Vite middleware during development.
   - Streams model responses to the frontend with Server-Sent Events.
   - Verifies Supabase access tokens before protected API work.

3. **AI orchestration**
   - `ReasoningController` formats requests and streams model output.
   - `contextInjector` adds personalization and memory context into the system prompt.
   - `promptCompiler` combines the base Paralex prompt with user settings and retrieved memories.

4. **Data and identity**
   - Supabase Auth handles GitHub login/register.
   - `profiles` stores GitHub profile details.
   - `memories` stores extracted user facts and preferences.
   - Browser local storage stores local chat history and UI settings.

```mermaid
flowchart LR
  User["User"] --> UI["React Frontend"]
  UI --> Auth["Supabase Auth"]
  UI --> API["Express API"]
  API --> Verify["Verify Supabase Token"]
  Verify --> Profiles["Supabase profiles"]
  Verify --> Memories["Supabase memories"]
  API --> Orchestrator["ReasoningController"]
  Orchestrator --> Prompt["Personalized Prompt"]
  Prompt --> Model["OpenRouter Model"]
  Model --> Stream["SSE Stream"]
  Stream --> UI
```

## Why Paralex Uses Linear Reasoning

Paralex currently favors a **linear reasoning path** for normal chat completion. Instead of spawning multiple agent branches for every user query, the backend formats one optimized model request and streams it directly.

This design is intentional:

- **Lower latency:** users receive tokens as soon as the model starts responding.
- **Simpler failure handling:** one request path is easier to recover from than several parallel model calls.
- **Lower cost:** each chat turn uses one main completion request.
- **Predictable UX:** streaming starts quickly and feels responsive.
- **Cleaner personalization:** memory and settings are injected before the response, instead of merged after several competing outputs.

The code still has room for richer orchestration later. Files such as `server/orchestrator/policies.ts` and `server/orchestrator/prompts.ts` suggest a future multi-role reasoning system, but the current production path is intentionally linear.

## Parallel Background Processing

Although final answer generation is linear, Paralex still performs some work in parallel.

During `/api/chat`:

1. The backend verifies the Supabase session.
2. The response-generation pipeline starts.
3. Memory extraction may run concurrently in the background.
4. The model response streams to the frontend.
5. When generation finishes, the backend awaits memory extraction.
6. The frontend receives either `memoryUpdated` or `memoryError`.

This gives Paralex a useful balance:

- The assistant can answer quickly.
- Memory can be extracted without blocking the visible response.
- Memory errors do not crash the main answer path.
- The UI can still notify the user when memory was saved.

```mermaid
sequenceDiagram
  participant UI as React Chat UI
  participant API as Express /api/chat
  participant M as Main Model
  participant ME as MemoryExtractor
  participant DB as Supabase memories

  UI->>API: POST messages + Supabase token + memory settings
  API->>API: Verify token and resolve user id
  par Main response
    API->>M: Stream completion request
    M-->>API: Token chunks
    API-->>UI: SSE text chunks
  and Background memory
    API->>ME: Extract memory candidates
    ME->>M: JSON extraction request
    M-->>ME: Memory JSON
    ME->>DB: Insert memory rows
  end
  API-->>UI: memoryUpdated or memoryError
  API-->>UI: [DONE]
```

## MemoryExtractor Responsibilities

`server/memoryExtractor.ts` is responsible for turning recent conversation content into structured long-term memory.

Its responsibilities are:

- Read the last few chat messages.
- Collect recent user-authored text.
- Ask the configured model to extract explicit facts, preferences, or project details.
- Require strict JSON output.
- Validate that each extracted item has at least:
  - `text`
  - `type`
  - optional `importanceScore`
- Write valid memories to Supabase through `memoryStore`.
- Report success or failure back to `/api/chat`.

The extractor should save only durable, useful information. Good memories are facts like:

- "User prefers concise TypeScript examples."
- "User is building Paralex with Supabase."
- "User wants GitHub-only authentication."

Weak memories should be avoided:

- One-off requests.
- Temporary instructions.
- Sensitive information unless the user explicitly asks to save it.
- Vague statements that will not help future responses.

## Full End-to-End Lifecycle

```mermaid
flowchart TD
  A["User opens Paralex"] --> B{"Has Supabase session?"}
  B -- No --> C["Landing page"]
  C --> D["Login/Register modal"]
  D --> E["GitHub OAuth via Supabase"]
  E --> F["Auth callback"]
  F --> G["Sync local profile settings"]
  F --> H["Upsert public.profiles row"]
  H --> I["Authenticated app shell"]
  B -- Yes --> I
  I --> J["User clicks Try Paralex"]
  J --> K["Protected /chat route"]
  K --> L["User sends message"]
  L --> M["Frontend gets Supabase access token"]
  M --> N["POST /api/chat"]
  N --> O["Express verifies token"]
  O --> P["Resolve user.id"]
  P --> Q{"Memory retrieval enabled?"}
  Q -- Yes --> R["Load memories from Supabase"]
  Q -- No --> S["Skip memory retrieval"]
  R --> T["Compile system prompt"]
  S --> T
  T --> U["Stream model response"]
  P --> V{"Auto memory enabled?"}
  V -- Yes --> W["MemoryExtractor analyzes recent user text"]
  W --> X["Insert memories into Supabase"]
  V -- No --> Y["Skip memory extraction"]
  U --> Z["Render assistant response"]
  X --> AA["Show Memory Updated"]
  Y --> AB["Finish normally"]
```

## Paralex Architecture

```mermaid
flowchart TB
  subgraph Frontend["Frontend"]
    App["App.tsx routes"]
    Landing["LandingPage"]
    AuthModal["RegistrationModal"]
    Callback["AuthCallback"]
    Chat["MainChat"]
    Settings["SettingsModal"]
    Dashboard["Dashboard"]
    ChatContext["ChatContext"]
    Zustand["settings store"]
  end

  subgraph Backend["Backend"]
    Express["server.ts"]
    AuthVerify["Supabase token verification"]
    Reasoning["ReasoningController"]
    Context["contextInjector"]
    Compiler["promptCompiler"]
    Extractor["MemoryExtractor"]
    Store["memoryStore"]
  end

  subgraph External["External Services"]
    SupabaseAuth["Supabase Auth"]
    SupabaseDB["Supabase Postgres"]
    OpenRouter["OpenRouter API"]
  end

  Landing --> AuthModal
  AuthModal --> SupabaseAuth
  SupabaseAuth --> Callback
  Callback --> SupabaseDB
  App --> Chat
  Chat --> ChatContext
  Chat --> Zustand
  Chat --> Express
  Settings --> Zustand
  Dashboard --> Express
  Express --> AuthVerify
  AuthVerify --> SupabaseAuth
  Express --> Reasoning
  Reasoning --> Context
  Context --> Store
  Store --> SupabaseDB
  Context --> Compiler
  Reasoning --> OpenRouter
  Extractor --> OpenRouter
  Extractor --> Store
```

## Front End Architecture Flow

The frontend is organized around routes, shared state, and a small set of major UI surfaces.

- `src/App.tsx`
  - Defines routes.
  - Protects `/chat`, `/dashboard`, and `/LandingPagewithDashboard`.
  - Syncs Supabase profile metadata into local settings.

- `src/pages/LandingPage.tsx`
  - Public landing page.
  - Opens login/register modal when unauthenticated users click Try Paralex.
  - Sends authenticated users to `/chat`.

- `src/components/RegistrationModal.tsx`
  - Starts GitHub OAuth through Supabase.

- `src/pages/AuthCallback.tsx`
  - Completes Supabase OAuth exchange.
  - Syncs profile data locally.
  - Upserts the `profiles` table.

- `src/context/ChatContext.tsx`
  - Stores local chat sessions.
  - Adds system prompt and messages to local chat history.

- `src/components/MainChat.tsx`
  - Sends chat requests.
  - Attaches Supabase access token.
  - Streams SSE chunks into the assistant message.
  - Displays memory status notifications.

- `src/components/SettingsModal.tsx`
  - Controls profile, personalization, model, memory, appearance, and privacy settings.
  - Memory toggles affect backend behavior through `memorySettings`.

```mermaid
flowchart TD
  A["App.tsx"] --> B["Public Landing Route"]
  A --> C["Protected Chat Route"]
  A --> D["Protected Dashboard Route"]
  B --> E["RegistrationModal"]
  E --> F["Supabase GitHub OAuth"]
  F --> G["AuthCallback"]
  G --> H["Profile Sync"]
  C --> I["MainChat"]
  I --> J["ChatContext local history"]
  I --> K["Zustand settings"]
  I --> L["/api/chat with bearer token"]
  D --> M["Memory Bank"]
  M --> N["/api/memories with bearer token"]
```

## User Workflow

1. User lands on the public Paralex page.
2. User clicks **Register**, **Log in**, or **Try Paralex**.
3. If not authenticated, Paralex opens the GitHub auth modal.
4. Supabase handles GitHub OAuth.
5. The callback stores profile details in:
   - local settings
   - Supabase `profiles`
6. User enters the authenticated app.
7. User opens chat.
8. User sends a message.
9. The frontend sends:
   - messages
   - selected model
   - search setting
   - memory settings
   - Supabase bearer token
10. Backend verifies the token.
11. Backend injects settings and, if enabled, memories.
12. Model response streams back to the UI.
13. Memory extraction runs in the background if enabled.
14. New memories appear in Supabase and the dashboard Memory Bank.

## Models Used

Paralex uses OpenRouter-compatible model IDs. The current UI exposes these model options in `src/components/MainChat.tsx` and `src/components/SettingsModal.tsx`:

| Model ID | Display Name | Provider | Current Usage |
|---|---|---|---|
| `openai/gpt-oss-20b:free` | GPT OSS 20B | OpenAI | Default model and fallback model |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron 3 Nano Omni Reasoning | NVIDIA | User-selectable chat model |
| `baidu/cobuddy:free` | Baidu Cobuddy | Baidu | User-selectable chat model |
| `poolside/laguna-m.1:free` | Poolside: Laguna M.1 | Poolside | User-selectable chat model |

The backend uses the selected model for:

- Main streamed assistant responses.
- Memory extraction, unless no model is provided, in which case it falls back to `openai/gpt-oss-20b:free`.

## Memory Toggle Semantics

The three memory controls work together:

| Toggle | Backend Effect |
|---|---|
| Memory Toggle | Master switch. If off, Paralex does not retrieve memories and does not save new memories. |
| Conversation Continuity | If on, saved memories are retrieved and injected into future prompts. |
| Auto Memory Detection | If on, recent user messages are analyzed and durable facts are saved. |

When the master Memory Toggle is off, the UI disables Conversation Continuity and Auto Memory Detection to make the dependency clear.

## Important Data Tables

### `profiles`

Stores user account details from GitHub/Supabase.

Expected fields:

- `id`
- `full_name`
- `email`
- `avatar_url`
- `github_username`
- `created_at`

### `memories`

Stores long-term user facts and preferences.

Expected fields:

- `id`
- `user_id`
- `text`
- `type`
- `importance_score`
- `source_chat_id`
- `status`
- `created_at`
- `updated_at`
- `last_used_at`
- `metadata`

Because `memories` uses RLS, policies must allow authenticated users to select, insert, update, and delete rows where `auth.uid() = user_id`.

