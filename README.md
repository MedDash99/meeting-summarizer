# Meeting Summarizer

A full-stack application for transcribing and summarizing meeting audio files using self-hosted faster-whisper (large-v3) and Claude API.

## Architecture

- **Backend**: FastAPI with faster-whisper (large-v3) for transcription
- **Frontend**: React + Vite with Tailwind CSS
- **APIs**: Claude Sonnet for summarization, python-docx for Word export

## Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- Anthropic API key
- ~10GB RAM available for Whisper large-v3 model

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd meeting-summarizer/backend
```

2. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
WHISPER_MODEL=large-v3
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
MAX_FILE_SIZE_MB=25
```

5. Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with docs at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd meeting-summarizer/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. Open the frontend in your browser
2. Drag and drop or select an audio file (MP3, WAV, M4A, WebM)
3. Wait for processing (transcription can take 15-30 minutes for a 30-minute audio file)
4. Review the summary, decisions, action items, and transcript
5. Download as Word document if needed

## Performance Notes

- **Transcription Speed**: On a 4-core ARM CPU, large-v3 processes audio at approximately 1x real-time (30 min audio ≈ 30 min processing)
- **Memory Usage**: The large-v3 model uses ~10GB RAM
- **Model Loading**: The model loads once at startup, subsequent requests are faster

## Project Structure

```
meeting-summarizer/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI routes
│   │   ├── config.py            # Settings
│   │   ├── services/            # Business logic
│   │   ├── models/              # Pydantic schemas
│   │   └── prompts/             # Claude prompts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/         # React components
│   └── package.json
└── README.md
```

## API Endpoints

- `POST /api/process` - Upload and process audio file
- `POST /api/export` - Generate Word document
- `GET /api/health` - Health check

## Troubleshooting

- **Model download**: The first run will download the large-v3 model (~3GB), ensure you have internet connectivity
- **Memory issues**: If you run out of memory, try using `medium` model instead of `large-v3`
- **Slow transcription**: This is expected on CPU. Consider using a GPU instance for faster processing
