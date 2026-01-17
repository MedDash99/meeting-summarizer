import asyncio
import json
from contextlib import asynccontextmanager
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, UploadFile, HTTPException, Form, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os

from app.services.transcription import transcribe_audio, AVAILABLE_MODELS, ModelName
from app.services.summarization import summarize_meeting
from app.services.export import create_word_document
from app.models.schemas import (
    ProcessingResponse,
    MeetingSummary,
    TranscriptionJobCreated,
    TranscriptRecord,
    TranscriptListResponse,
    TranscriptListItem,
    TranscriptUpdateRequest,
)
from app.config import settings
from app import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    db.init_db()
    yield


app = FastAPI(title="Meeting Summarizer API", lifespan=lifespan)

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


async def _run_transcription_job(
    job_id: str,
    tmp_path: str,
    model_name: ModelName = "large-v3",
    db_id: Optional[str] = None,
    summarize: bool = False,
) -> None:
    try:
        transcript = await transcribe_audio(tmp_path, model_name=model_name)
        
        if summarize:
            # Get structured summary from LLM
            summary_dict = await summarize_meeting(transcript)
            summary = MeetingSummary(**summary_dict, transcript=transcript)
        else:
            summary = MeetingSummary(
                title="Transcription",
                summary="",
                transcript=transcript,
            )
        await _update_transcription_job(job_id, "success", data=summary)
        
        # Save to database
        if db_id:
            db.update_transcript(
                db_id,
                status="completed",
                transcript=transcript,
                summary_json=json.dumps(summary.model_dump()),
            )
    except Exception as e:
        await _update_transcription_job(job_id, "error", error=str(e))
        if db_id:
            db.update_transcript(db_id, status="error", error=str(e))
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
    original_filename = file.filename or "unknown"
    tmp_path = await _save_upload_file(file)
    
    # Create database record
    db_id = db.create_transcript(
        original_filename=original_filename,
        model=model,
        status="processing",
    )
    
    try:
        # Step 1: Transcribe
        transcript = await transcribe_audio(tmp_path, model_name=model)
        
        if summarize:
            # Step 2: Get structured summary from LLM
            summary_dict = await summarize_meeting(transcript)
            summary = MeetingSummary(**summary_dict, transcript=transcript)
        else:
            summary = MeetingSummary(
                title="Transcription",
                summary="",
                transcript=transcript,
            )
        
        # Save to database
        db.update_transcript(
            db_id,
            status="completed",
            transcript=transcript,
            summary_json=json.dumps(summary.model_dump()),
        )
        
        return ProcessingResponse(status="success", data=summary)
    except Exception as e:
        db.update_transcript(db_id, status="error", error=str(e))
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
    summarize: bool = Form(False),
):
    """Start transcription job and return a job id."""
    if model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Available: {', '.join(AVAILABLE_MODELS)}",
        )
    original_filename = file.filename or "unknown"
    tmp_path = await _save_upload_file(file)
    job_id = uuid4().hex
    
    # Create database record
    db_id = db.create_transcript(
        original_filename=original_filename,
        model=model,
        status="processing",
    )
    
    await _update_transcription_job(job_id, "processing")
    background_tasks.add_task(_run_transcription_job, job_id, tmp_path, model, db_id, summarize)
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


# Transcript persistence endpoints
@app.get("/api/transcripts", response_model=TranscriptListResponse)
async def list_transcripts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List recent transcripts."""
    transcripts = db.list_transcripts(limit=limit, offset=offset)
    total = db.count_transcripts()
    
    return TranscriptListResponse(
        transcripts=[TranscriptListItem(**t) for t in transcripts],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.get("/api/transcripts/{transcript_id}", response_model=TranscriptRecord)
async def get_transcript(transcript_id: str):
    """Get a transcript by ID."""
    record = db.get_transcript(transcript_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return TranscriptRecord(**record)


@app.patch("/api/transcripts/{transcript_id}")
async def update_transcript(transcript_id: str, update: TranscriptUpdateRequest):
    """Update transcript display name."""
    success = db.update_transcript_name(transcript_id, update.display_name)
    if not success:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return {"status": "updated"}


@app.delete("/api/transcripts/{transcript_id}")
async def delete_transcript(transcript_id: str):
    """Delete a transcript."""
    success = db.delete_transcript(transcript_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return {"status": "deleted"}


@app.post("/api/transcripts/{transcript_id}/summarize", response_model=ProcessingResponse)
async def summarize_existing_transcript(transcript_id: str):
    """Generate a summary for an existing transcript."""
    record = db.get_transcript(transcript_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    transcript_text = record.get("transcript")
    if not transcript_text:
        raise HTTPException(status_code=400, detail="No transcript text available")
    
    try:
        # Generate structured summary from LLM
        summary_dict = await summarize_meeting(transcript_text)
        summary = MeetingSummary(**summary_dict, transcript=transcript_text)
        
        # Update database with new summary
        db.update_transcript(
            transcript_id,
            status="completed",
            summary_json=json.dumps(summary.model_dump()),
        )
        
        return ProcessingResponse(status="success", data=summary)
    except Exception as e:
        return ProcessingResponse(status="error", error=str(e))
