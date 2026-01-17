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
    date: Optional[str] = None
    duration: Optional[str] = None
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


class TranscriptionJobCreated(BaseModel):
    status: str
    job_id: str
