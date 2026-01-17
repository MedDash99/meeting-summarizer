import asyncio
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os

from app.services.transcription import transcribe_audio, AVAILABLE_MODELS, ModelName
from app.services.summarization import summarize_meeting
from app.services.export import create_word_document
from app.models.schemas import ProcessingResponse, MeetingSummary, TranscriptionJobCreated
from app.config import settings

app = FastAPI(title="Meeting Summarizer API")

_transcription_jobs: dict[str, dict[str, object]] = {}
_transcription_jobs_lock = asyncio.Lock()


async def _save_upload_file(file: UploadFile) -> str:
    """Validate and save uploaded file to a temp path."""
    file_ext = os.path.splitext(file.filename)[1].lower().lstrip('.')
    if file_ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(settings.allowed_extensions)}"
        )

    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB"
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    await file.close()
    return tmp_path


async def _update_transcription_job(
    job_id: str,
    status: str,
    data: Optional[MeetingSummary] = None,
    error: Optional[str] = None,
) -> None:
    async with _transcription_jobs_lock:
        _transcription_jobs[job_id] = {
            "status": status,
            "data": data,
            "error": error,
        }


async def _run_transcription_job(job_id: str, tmp_path: str, model_name: ModelName = "large-v3") -> None:
    try:
        transcript = await transcribe_audio(tmp_path, model_name=model_name)
        summary = MeetingSummary(
            title="Transcription",
            date=None,
            duration=None,
            participants=[],
            summary="",
            key_points=[],
            decisions=[],
            action_items=[],
            transcript=transcript,
        )
        await _update_transcription_job(job_id, "success", data=summary)
    except Exception as e:
        await _update_transcription_job(job_id, "error", error=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://141.148.51.40:5173"],  # Vite default
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/process", response_model=ProcessingResponse)
async def process_meeting(
    file: UploadFile,
    summarize: bool = Form(False),
    model: str = Form("large-v3"),
):
    """Process audio file: transcribe and optionally summarize."""
    if model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Available: {', '.join(AVAILABLE_MODELS)}",
        )
    tmp_path = await _save_upload_file(file)
    
    try:
        # Step 1: Transcribe
        transcript = await transcribe_audio(tmp_path, model_name=model)
        
        if summarize:
            # Step 2: Summarize with Claude
            summary = await summarize_meeting(transcript)
            summary.transcript = transcript
        else:
            summary = MeetingSummary(
                title="Transcription",
                date=None,
                duration=None,
                participants=[],
                summary="",
                key_points=[],
                decisions=[],
                action_items=[],
                transcript=transcript,
            )
        
        return ProcessingResponse(status="success", data=summary)
    except Exception as e:
        return ProcessingResponse(
            status="error",
            error=str(e)
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/api/models")
async def list_models():
    """List available transcription models."""
    return {"models": list(AVAILABLE_MODELS)}


@app.post("/api/transcriptions", response_model=TranscriptionJobCreated)
async def start_transcription(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    model: str = Form("large-v3"),
):
    """Start transcription job and return a job id."""
    if model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Available: {', '.join(AVAILABLE_MODELS)}",
        )
    tmp_path = await _save_upload_file(file)
    job_id = uuid4().hex
    await _update_transcription_job(job_id, "processing")
    background_tasks.add_task(_run_transcription_job, job_id, tmp_path, model)
    return TranscriptionJobCreated(status="accepted", job_id=job_id)


@app.get("/api/transcriptions/{job_id}", response_model=ProcessingResponse)
async def get_transcription(job_id: str):
    """Check transcription job status and retrieve results."""
    async with _transcription_jobs_lock:
        job = _transcription_jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Transcription job not found")

    return ProcessingResponse(
        status=job["status"],
        data=job.get("data"),
        error=job.get("error"),
    )


@app.post("/api/export")
async def export_to_word(summary: MeetingSummary):
    """Generate and download Word document from meeting summary."""
    try:
        doc_path = create_word_document(summary)
        return FileResponse(
            doc_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename="meeting_summary.docx"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
