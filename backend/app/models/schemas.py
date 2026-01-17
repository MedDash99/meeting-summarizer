from pydantic import BaseModel
from typing import Optional


class Participant(BaseModel):
    name: Optional[str] = None  # Allow null names (speaker may be unidentified)
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
    summary: str
    participants: Optional[list[Participant]] = None  # May be empty/unknown
    key_points: Optional[list[str]] = None  # May have no key points
    decisions: Optional[list[Decision]] = None  # May have no decisions
    action_items: Optional[list[ActionItem]] = None  # May have no action items
    transcript: str


class ProcessingResponse(BaseModel):
    status: str
    data: Optional[MeetingSummary] = None
    error: Optional[str] = None


class TranscriptionJobCreated(BaseModel):
    status: str
    job_id: str


# Transcript persistence schemas
class TranscriptRecord(BaseModel):
    id: str
    created_at: str
    original_filename: str
    display_name: str
    model: str
    status: str
    transcript: Optional[str] = None
    summary_json: Optional[str] = None
    error: Optional[str] = None


class TranscriptListItem(BaseModel):
    id: str
    created_at: str
    original_filename: str
    display_name: str
    model: str
    status: str
    error: Optional[str] = None


class TranscriptListResponse(BaseModel):
    transcripts: list[TranscriptListItem]
    total: int
    limit: int
    offset: int


class TranscriptUpdateRequest(BaseModel):
    display_name: str
