# Meeting Transcription & Summarization System - Implementation Plan

## Recommended Tech Stack

### Backend: FastAPI (Python)
**Why FastAPI over Flask/Django:**
- **Async-native**: Like having multiple checkout lanes open vs. one. When waiting for Whisper API (transcription) or Claude API (summarization), FastAPI can handle other requests instead of blocking.
- **Automatic OpenAPI docs**: Free Swagger UI at `/docs` — great for demo day.
- **Pydantic validation**: Request/response validation with zero boilerplate.
- **Type hints**: Better IDE support and self-documenting code.

### Frontend: React + Vite
**Why Vite:**
- Lightning-fast dev server (ES modules, no bundling during dev)
- Simple setup, minimal config
- For this scope, no need for Next.js complexity

**UI Approach:** 
- Tailwind CSS for rapid styling
- Keep it simple: single-page app with upload → processing → results flow

### APIs
| Service | Choice | Reasoning |
|---------|--------|-----------|
| Transcription | OpenAI Whisper API | Cloud API = no GPU requirements, simple deployment, reliable |
| Summarization | Claude API (Sonnet) | Fast enough for good UX, smart enough for quality extraction |
| Word Export | python-docx | Lightweight, well-documented, does exactly what's needed |

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│                 │     │              FastAPI Backend              │
│  React Frontend │────▶│                                          │
│                 │     │  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
└─────────────────┘     │  │ Upload  │─▶│ Whisper │─▶│  Claude  │ │
                        │  │ Handler │  │   API   │  │   API    │ │
                        │  └─────────┘  └─────────┘  └──────────┘ │
                        │                                    │     │
                        │              ┌─────────────────────┘     │
                        │              ▼                           │
                        │       ┌────────────┐                     │
                        │       │ python-docx│ ──▶ .docx export   │
                        │       └────────────┘                     │
                        └──────────────────────────────────────────┘
```

---

## Project Structure

```
meeting-summarizer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, routes
│   │   ├── config.py            # Settings, API keys
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── transcription.py # Whisper API integration
│   │   │   ├── summarization.py # Claude API + system prompt
│   │   │   └── export.py        # Word document generation
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py       # Pydantic models
│   │   └── prompts/
│   │       └── meeting_summary.py # System prompt (separate file!)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── ProcessingStatus.jsx
│   │   │   ├── ResultsDisplay.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── hooks/
│   │   │   └── useUpload.js
│   │   └── api/
│   │       └── client.js
│   ├── package.json
│   └── vite.config.js
├── PROCESS.md
├── README.md
└── docker-compose.yml (optional)
```

---

## Implementation Phases

### Phase 1: Backend Foundation (1-1.5 hours)

#### 1.1 Project Setup
```bash
# Create project structure
mkdir -p backend/app/{services,models,prompts}
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-multipart anthropic openai python-docx pydantic-settings
```

#### 1.2 Configuration (`config.py`)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    anthropic_api_key: str
    max_file_size_mb: int = 25
    allowed_extensions: list = ["mp3", "wav", "m4a", "webm"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 1.3 Pydantic Models (`schemas.py`)
```python
from pydantic import BaseModel
from typing import Optional

class Participant(BaseModel):
    name: str
    role: Optional[str] = None

class ActionItem(BaseModel):
    task: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None

class Decision(BaseModel):
    description: str
    context: Optional[str] = None

class MeetingSummary(BaseModel):
    title: str
    date: Optional[str]
    duration: Optional[str]
    participants: list[Participant]
    summary: str
    key_points: list[str]
    decisions: list[Decision]
    action_items: list[ActionItem]
    transcript: str

class ProcessingResponse(BaseModel):
    status: str
    data: Optional[MeetingSummary] = None
    error: Optional[str] = None
```

#### 1.4 Main FastAPI App (`main.py`)
```python
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os

from app.services.transcription import transcribe_audio
from app.services.summarization import summarize_meeting
from app.services.export import create_word_document
from app.models.schemas import ProcessingResponse

app = FastAPI(title="Meeting Summarizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/process", response_model=ProcessingResponse)
async def process_meeting(file: UploadFile):
    # Validate file
    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.webm')):
        raise HTTPException(400, "Invalid file type")
    
    # Save temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Step 1: Transcribe
        transcript = await transcribe_audio(tmp_path)
        
        # Step 2: Summarize with Claude
        summary = await summarize_meeting(transcript)
        summary.transcript = transcript
        
        return ProcessingResponse(status="success", data=summary)
    finally:
        os.unlink(tmp_path)

@app.post("/api/export")
async def export_to_word(summary: MeetingSummary):
    doc_path = create_word_document(summary)
    return FileResponse(
        doc_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="meeting_summary.docx"
    )
```

---

### Phase 2: Service Integrations (1.5-2 hours)

#### 2.1 Transcription Service (`transcription.py`)
```python
from openai import AsyncOpenAI
from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio using OpenAI Whisper API.
    Returns full transcript text.
    """
    with open(file_path, "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
            language="en"  # Optional: auto-detect if multilingual
        )
    return response
```

#### 2.2 Summarization Service (`summarization.py`)
```python
import anthropic
import json
from app.config import settings
from app.models.schemas import MeetingSummary
from app.prompts.meeting_summary import SYSTEM_PROMPT

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

async def summarize_meeting(transcript: str) -> MeetingSummary:
    """
    Use Claude to extract structured meeting information.
    """
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Please analyze this meeting transcript and extract the requested information:\n\n{transcript}"
            }
        ]
    )
    
    # Parse Claude's JSON response
    result = json.loads(response.content[0].text)
    return MeetingSummary(**result, transcript=transcript)
```

#### 2.3 The System Prompt (`prompts/meeting_summary.py`)

This is the **critical component** they're evaluating. Here's a well-crafted prompt with explanations:

```python
SYSTEM_PROMPT = """You are a professional meeting analyst. Your task is to analyze meeting transcripts and extract structured, actionable information.

## Output Format
Respond ONLY with valid JSON matching this exact structure:
```json
{
  "title": "Brief descriptive title for the meeting",
  "date": "Date if mentioned, otherwise null",
  "duration": "Duration if mentioned, otherwise null",
  "participants": [
    {"name": "Person name", "role": "Their role if identifiable"}
  ],
  "summary": "2-3 paragraph executive summary of the meeting",
  "key_points": ["Key discussion point 1", "Key discussion point 2"],
  "decisions": [
    {"description": "What was decided", "context": "Why/background"}
  ],
  "action_items": [
    {"task": "Specific task", "assignee": "Who if mentioned", "deadline": "When if mentioned"}
  ]
}
```

## Analysis Guidelines

### Participant Identification
- Extract names from direct mentions ("John said...", "Thanks, Sarah")
- Infer roles from context (technical discussions → developer, budget talk → finance)
- If speakers aren't named, use "Speaker 1", "Speaker 2" etc.

### Summary Writing
- Lead with the meeting's main purpose
- Highlight outcomes over process
- Keep it scannable for executives

### Action Items
- Must be SPECIFIC and ACTIONABLE (not "discuss further")
- Include assignee only if explicitly stated or clearly implied
- Include deadline only if explicitly mentioned

### Decisions
- Distinguish between decisions (finalized) vs. discussions (ongoing)
- Include context for why decisions were made when available

## Quality Standards
- If something is unclear or not mentioned, use null rather than guessing
- Prefer precision over completeness
- Extract verbatim quotes for key decisions when impactful
"""
```

**Why this prompt structure works:**
1. **Clear role definition**: Sets context and expectations upfront
2. **Exact JSON schema**: Removes ambiguity, ensures parseable output
3. **Section-by-section guidance**: Specific instructions for each extraction task
4. **Edge case handling**: Explicit guidance on unknowns (use null, not guesses)
5. **Quality standards**: Prevents common LLM issues like hallucination

#### 2.4 Export Service (`export.py`)
```python
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
import tempfile

from app.models.schemas import MeetingSummary

def create_word_document(summary: MeetingSummary) -> str:
    """Generate a formatted Word document from meeting summary."""
    doc = Document()
    
    # Title
    title = doc.add_heading(summary.title, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Metadata
    if summary.date or summary.duration:
        meta = []
        if summary.date:
            meta.append(f"Date: {summary.date}")
        if summary.duration:
            meta.append(f"Duration: {summary.duration}")
        doc.add_paragraph(" | ".join(meta))
    
    # Participants
    doc.add_heading("Participants", level=1)
    for p in summary.participants:
        role_str = f" ({p.role})" if p.role else ""
        doc.add_paragraph(f"• {p.name}{role_str}")
    
    # Executive Summary
    doc.add_heading("Executive Summary", level=1)
    doc.add_paragraph(summary.summary)
    
    # Key Points
    doc.add_heading("Key Discussion Points", level=1)
    for point in summary.key_points:
        doc.add_paragraph(f"• {point}")
    
    # Decisions
    if summary.decisions:
        doc.add_heading("Decisions Made", level=1)
        for d in summary.decisions:
            p = doc.add_paragraph(f"✓ {d.description}")
            if d.context:
                doc.add_paragraph(f"   Context: {d.context}").italic = True
    
    # Action Items
    if summary.action_items:
        doc.add_heading("Action Items", level=1)
        table = doc.add_table(rows=1, cols=3)
        table.style = 'Table Grid'
        header_cells = table.rows[0].cells
        header_cells[0].text = "Task"
        header_cells[1].text = "Assignee"
        header_cells[2].text = "Deadline"
        
        for item in summary.action_items:
            row_cells = table.add_row().cells
            row_cells[0].text = item.task
            row_cells[1].text = item.assignee or "TBD"
            row_cells[2].text = item.deadline or "TBD"
    
    # Full Transcript (collapsible section idea - just add at end)
    doc.add_page_break()
    doc.add_heading("Full Transcript", level=1)
    doc.add_paragraph(summary.transcript)
    
    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    doc.save(tmp.name)
    return tmp.name
```

---

### Phase 3: Frontend (1-1.5 hours)

#### 3.1 Setup
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 3.2 Component Structure

**App.jsx** - Main orchestrator with state machine:
```jsx
import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultsDisplay from './components/ResultsDisplay';

// States: idle → uploading → processing → complete/error
function App() {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Meeting Summarizer
        </h1>
        
        {state === 'idle' && (
          <FileUpload 
            onUploadStart={() => setState('uploading')}
            onProcessing={() => setState('processing')}
            onComplete={(data) => { setResult(data); setState('complete'); }}
            onError={(err) => { setError(err); setState('error'); }}
          />
        )}
        
        {(state === 'uploading' || state === 'processing') && (
          <ProcessingStatus stage={state} />
        )}
        
        {state === 'complete' && (
          <ResultsDisplay 
            data={result} 
            onReset={() => { setState('idle'); setResult(null); }}
          />
        )}
        
        {state === 'error' && (
          <div className="text-red-600 text-center">
            <p>{error}</p>
            <button onClick={() => setState('idle')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**FileUpload.jsx** - Drag & drop with validation:
```jsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export default function FileUpload({ onUploadStart, onProcessing, onComplete, onError }) {
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    onUploadStart();
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      onProcessing();
      const response = await axios.post('http://localhost:8000/api/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onComplete(response.data.data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Processing failed');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.webm'] },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      <p className="text-lg text-gray-600">
        {isDragActive 
          ? 'Drop your audio file here...' 
          : 'Drag & drop an audio file, or click to select'}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        Supports MP3, WAV, M4A, WebM
      </p>
    </div>
  );
}
```

**ResultsDisplay.jsx** - Clean, tabbed results view:
```jsx
import { useState } from 'react';

export default function ResultsDisplay({ data, onReset }) {
  const [activeTab, setActiveTab] = useState('summary');
  
  const handleExport = async () => {
    const response = await fetch('http://localhost:8000/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting_summary.docx';
    a.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{data.title}</h2>
        <div className="space-x-2">
          <button onClick={handleExport} className="btn-primary">
            Download Word
          </button>
          <button onClick={onReset} className="btn-secondary">
            New Upload
          </button>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="border-b mb-4">
        {['summary', 'decisions', 'actions', 'transcript'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 ${activeTab === tab ? 'border-b-2 border-blue-500' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      {activeTab === 'summary' && (
        <div>
          <h3 className="font-semibold mb-2">Participants</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.participants.map((p, i) => (
              <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                {p.name} {p.role && `(${p.role})`}
              </span>
            ))}
          </div>
          <h3 className="font-semibold mb-2">Summary</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{data.summary}</p>
        </div>
      )}
      
      {activeTab === 'decisions' && (
        <ul className="space-y-3">
          {data.decisions.map((d, i) => (
            <li key={i} className="border-l-4 border-green-500 pl-4">
              <p className="font-medium">{d.description}</p>
              {d.context && <p className="text-sm text-gray-500">{d.context}</p>}
            </li>
          ))}
        </ul>
      )}
      
      {activeTab === 'actions' && (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Task</th>
              <th className="text-left py-2">Assignee</th>
              <th className="text-left py-2">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {data.action_items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{item.task}</td>
                <td className="py-2">{item.assignee || '—'}</td>
                <td className="py-2">{item.deadline || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {activeTab === 'transcript' && (
        <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm">{data.transcript}</pre>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 4: Polish & Documentation (0.5-1 hour)

#### 4.1 Error Handling Improvements
- Add retry logic for API failures
- Implement file size validation on frontend
- Add loading skeletons for better perceived performance

#### 4.2 PROCESS.md Template
```markdown
# Development Process

## Planning Phase
[Document your initial approach, architecture decisions]

## AI Usage
### Example 1: [Task]
**Prompt:** [What you asked]
**Result:** [What you got, how you modified it]

### Example 2: ...

## Challenges & Solutions
| Challenge | How I Solved It |
|-----------|-----------------|
| ... | ... |

## Time Breakdown
| Phase | Estimated | Actual |
|-------|-----------|--------|
| Backend setup | 1h | |
| API integrations | 1.5h | |
| Frontend | 1h | |
| Testing & polish | 0.5h | |
| **Total** | **4h** | |
```

#### 4.3 README.md
Include clear setup instructions:
```markdown
## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key
- Anthropic API key

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173
```

---

## Time Estimate Summary

| Phase | Task | Time |
|-------|------|------|
| 1 | Backend foundation | 1-1.5h |
| 2 | API integrations | 1.5-2h |
| 3 | Frontend | 1-1.5h |
| 4 | Polish & docs | 0.5-1h |
| **Total** | | **4-6h** |

---

## Key Success Factors

1. **System Prompt Quality**: This is explicitly evaluated. Invest time in crafting clear, structured prompts with good edge case handling.

2. **Clean Code Structure**: Separation of concerns shows you think architecturally, not just "make it work."

3. **Document Your Process**: The PROCESS.md is as important as the code. Show your thinking.

4. **Working Demo**: A polished UI that actually works > feature-complete but buggy.

5. **Smart AI Usage**: Use AI tools to accelerate, but understand and own the code. Be ready to explain every decision.