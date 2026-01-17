import asyncio
from typing import Optional
from faster_whisper import WhisperModel
from app.config import settings

# Singleton model instance - loaded once at startup
_model: Optional[WhisperModel] = None


def _get_model() -> WhisperModel:
    """Get or initialize the Whisper model singleton."""
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type
        )
    return _model


async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio using faster-whisper.
    Returns full transcript text.
    """
    model = _get_model()
    
    # Run transcription in thread pool to avoid blocking
    segments, info = await asyncio.to_thread(
        model.transcribe,
        file_path,
        beam_size=5,
        vad_filter=True
    )
    
    # Combine all segments into full transcript
    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text)
    
    return " ".join(transcript_parts).strip()
