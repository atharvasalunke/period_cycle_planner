from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date


class TaskItem(BaseModel):
    title: str
    dueDateISO: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    category: Optional[str] = None
    sourceSpan: Optional[str] = None


class CyclePhaseDate(BaseModel):
    date: str  # YYYY-MM-DD
    phase: str  # 'period' | 'follicular' | 'ovulation' | 'luteal'
    dayOfCycle: int


class OrganizeRequest(BaseModel):
    text: str
    todayISO: str  # YYYY-MM-DD
    timezone: Optional[str] = "EST"
    cyclePhaseCalendar: Optional[List[CyclePhaseDate]] = None  # Calendar of cycle phases for upcoming dates


class OrganizeResponse(BaseModel):
    tasks: List[TaskItem]
    notes: List[str]
    followUps: List[str]
    suggestions: List[str]


class ChatWithTasksRequest(BaseModel):
    message: str
    tasks: List[TaskItem]
    todayISO: str
    timezone: Optional[str] = "UTC"


class TaskUpdate(BaseModel):
    index: int
    updates: Dict[str, Any]


class ChatWithTasksResponse(BaseModel):
    response: str
    newTasks: Optional[List[TaskItem]] = None
    updatedTasks: Optional[List[TaskUpdate]] = None

