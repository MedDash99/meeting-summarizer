# Development Process Documentation

This document describes the development process, AI usage, challenges, and solutions encountered while building the Meeting Summarizer application.

## 1. Planning Phase

### Initial Requirements Analysis

The goal was to build a meeting transcription and summarization tool with:
- Audio file upload and transcription (using Whisper)
- AI-powered summarization with structured output
- Clean React UI to display results
- Word document export functionality

### Architecture Decisions

**Backend (Python/FastAPI)**
- Chose FastAPI for async support and automatic OpenAPI documentation
- Used faster-whisper for local transcription (faster than OpenAI's API, no API costs)
- SQLite for simple persistence (no need for complex DB setup)
- Background job processing for long transcriptions

**Frontend (React/Vite)**
- Vite for fast development experience
- Tailwind CSS for rapid UI development
- Component-based architecture with clear separation of concerns

**AI Integration**
- OpenAI GPT-5mini for summarization (reliable structured output support)
- JSON Schema for structured output to ensure consistent data format
- Flexible schema design to handle missing data gracefully

### Data Flow Design

```
Audio File → Whisper Transcription → GPT-5mini Summarization → Structured JSON → UI Display
                                                                          ↓
                                                                    Word Export
```

## 2. AI Usage During Development

### Prompt Engineering for Summarization

The main AI component is the meeting summarization prompt. Key design decisions:

**Initial Prompt (v1)**
```
Summarize this meeting transcript.
```
*Problem*: Output was unstructured plain text, hard to parse.

**Improved Prompt (v2)**
```
Analyze this meeting transcript and extract:
- Title
- Summary
- Participants
- Key Points
- Decisions
- Action Items
```
*Problem*: Inconsistent output format, sometimes missing fields.

**Final Prompt (v3) - with Structured Output**
Used OpenAI's JSON Schema feature to guarantee structured output:
- System prompt provides clear instructions for each field
- JSON Schema enforces output format
- Nullable fields for handling missing information

See `backend/app/prompts/meeting_summary.py` for the full prompt and schema.

### AI Tools Used During Development

1. **Code Generation**: Used AI assistants for boilerplate code (FastAPI routes, React components)
2. **Debugging**: AI helped identify issues with async/await patterns in the backend
3. **UI Design**: AI suggested Tailwind CSS classes for consistent styling

### Example Development Prompts Used

1. "Create a FastAPI endpoint that accepts audio file uploads and returns transcription status"
2. "Design a React component that displays meeting participants as pills/badges"
3. "How do I use OpenAI's structured output feature with a custom JSON schema?"

## 3. Challenges and Solutions

### Challenge 1: Handling Missing Data in Summaries

**Problem**: Not all meetings have identifiable participants, decisions, or action items. Monologues, presentations, and informal chats often lack these elements.

**Solution**: 
- Made all fields except `title` and `summary` optional in the schema
- Used nullable types (`["array", "null"]`) to distinguish "no data found" from empty arrays
- Updated UI to gracefully hide sections when data is null

### Challenge 2: Long Transcription Processing

**Problem**: Audio files over 10 minutes could take 30+ seconds to transcribe, causing HTTP timeouts.

**Solution**:
- Implemented background job processing with job ID polling
- Frontend polls `/api/transcriptions/{job_id}` until completion
- Added ProcessingStatus component to show progress

### Challenge 3: Structured Output Schema Validation

**Problem**: OpenAI's structured output requires `strict: true` but wouldn't accept union types like `["string", "null"]` initially.

**Solution**:
- Discovered that all properties in objects must be listed in `required` array for strict mode
- Used `required: ["name", "role"]` even for nullable fields
- The actual value can still be null, but the key must be present

### Challenge 4: Word Export with Optional Fields

**Problem**: Export service crashed when iterating over null arrays.

**Solution**:
- Added null checks before all list iterations
- Sections only render in Word document if data exists
- Handle null participant names with "Unknown Speaker" fallback

## 4. Time Tracking

| Phase | Time Spent |
|-------|------------|
| Requirements analysis & planning | 1 hour |
| Backend setup (FastAPI, DB) | 2 hours |
| Transcription service (faster-whisper) | 1 hour |
| Summarization service (OpenAI) | .5 hours |
| Frontend UI (React, Tailwind) | .5 hours |
| Integration & testing | .5 hours |
| Bug fixes & refinements | .5 hours |
| Deployment | 2 hour |
| Documentation | .25 hours |
| **Total** | **8.25 hours** |

## 5. Key Learnings

1. **Schema Design Matters**: Flexible schemas that handle edge cases prevent runtime errors and improve UX.

2. **Structured Output > Parsing**: Using OpenAI's structured output feature is more reliable than regex/parsing.

3. **Background Processing**: Long-running tasks should always be processed asynchronously.

4. **Progressive Enhancement**: Start with core functionality (transcription), then add features (summarization, export).

## 6. Future Improvements

- Add speaker diarization (identify who said what)
- Support real-time transcription via WebSocket
- Add meeting templates for different meeting types
- Implement search across historical transcripts
- Add collaborative editing of summaries
- Migrate summarization from Chat Completions API to the newer Responses API (enables saved prompt IDs, better alignment with OpenAI’s roadmap)
