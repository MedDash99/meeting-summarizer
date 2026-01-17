import asyncio
from typing import Dict, Literal, Optional
from faster_whisper import WhisperModel
from app.config import settings

ModelName = Literal["base", "small", "large-v3"]

AVAILABLE_MODELS: list[ModelName] = ["base", "small", "large-v3"]

# Cache for loaded models
_models: Dict[str, WhisperModel] = {}


def _get_model(model_name: ModelName) -> WhisperModel:
    """Get or initialize a Whisper model by name."""
    if model_name not in _models:
        _models[model_name] = WhisperModel(
            model_name,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    return _models[model_name]


def preload_models() -> None:
    """Pre-load all models into memory for instant switching."""
    for name in AVAILABLE_MODELS:
        print(f"Loading Whisper model: {name}...")
        _get_model(name)
    print("All models loaded.")


async def transcribe_audio(file_path: str, model_name: ModelName = "large-v3") -> str:
    """
    Transcribe audio using faster-whisper.
    Returns full transcript text.
    """
    model = _get_model(model_name)

    # Run transcription in thread pool to avoid blocking
    segments, info = await asyncio.to_thread(
        model.transcribe,
        file_path,
        beam_size=5,
        vad_filter=True,
    )

    # Combine all segments into full transcript
    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text)

    return " ".join(transcript_parts).strip()
