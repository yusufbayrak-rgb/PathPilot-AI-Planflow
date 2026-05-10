from pydantic import BaseModel, Field
from typing import List, Optional

# Auth Models
class UserCreate(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    email: str
    total_coins: int
    first_name: str = ""
    last_name: str = ""

class UserUpdate(BaseModel):
    first_name: str
    last_name: str

# Roadmap Models
class RoadmapRequest(BaseModel):
    target: str
    duration: int
    daily_time: int
    level: str

class SubTaskItem(BaseModel):
    id: Optional[int] = None
    title: str
    estimated_minutes: int
    actionable_step: str
    coin_reward: int
    completed: bool = False

class TaskItem(BaseModel):
    id: Optional[int] = None
    title: str
    estimated_minutes: int
    actionable_step: str
    coin_reward: int
    completed: bool = False
    completion_percentage: int = 0
    subtasks: List[SubTaskItem] = []

class PhaseItem(BaseModel):
    id: Optional[int] = None
    phase_name: str
    tasks: List[TaskItem]

class RoadmapResponse(BaseModel):
    id: Optional[int] = None
    target: str
    duration: int
    created_at: str
    total_minutes: int = 0
    completed_minutes: int = 0
    roadmap: List[PhaseItem]

# Progress Models
class ProgressRequest(BaseModel):
    task_id: int
    user_text: str

class ProgressResponse(BaseModel):
    status: str = Field(description="completed | partial")
    completion_percentage: int
    feedback: str
    next_action: str = Field(description="close | subtasks")
    subtasks: List[SubTaskItem] = []
    earned_coins: int = 0

class ProjectSummary(BaseModel):
    id: int
    title: str
    completion_percentage: int
