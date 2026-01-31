from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class TaskItem(BaseModel):
    title: str
    dueDateISO: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    category: Optional[str] = None
    sourceSpan: Optional[str] = None


class OrganizeRequest(BaseModel):
    text: str
    todayISO: str  # YYYY-MM-DD
    timezone: Optional[str] = "UTC"


class OrganizeResponse(BaseModel):
    tasks: List[TaskItem]
    notes: List[str]
    followUps: List[str]
    suggestions: List[str]

