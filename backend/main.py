import os
import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import ValidationError
from sqlalchemy.orm import Session
import hashlib
import jwt

from database import SessionLocal, engine, Base, DBUser, DBProject, DBPhase, DBTask, DBSubTask
from models import (
    RoadmapRequest, RoadmapResponse, ProgressRequest, ProgressResponse,
    UserCreate, UserLogin, Token, UserResponse, ProjectSummary,
    PhaseItem, TaskItem, SubTaskItem
)

load_dotenv()

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DeepStep AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Config
SECRET_KEY = "supersecret_planflow_hackathon_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# OpenAI / Gemini Config
is_gemini_only = bool(os.getenv("GEMINI_API_KEY") and not os.getenv("OPENAI_API_KEY"))
if is_gemini_only:
    client = AsyncOpenAI(
        api_key=os.getenv("GEMINI_API_KEY"),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    model_name = "gemini-2.5-flash"
else:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY") or "dummy-key")
    model_name = "gpt-4o-mini"

# ================= AUTH ENDPOINTS =================
@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = DBUser(email=user.email, hashed_password=hashed_password, total_coins=0)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": new_user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": db_user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
def get_me(current_user: DBUser = Depends(get_current_user)):
    return {"email": current_user.email, "total_coins": current_user.total_coins}

# ================= PROJECT ENDPOINTS =================
@app.get("/projects", response_model=List[ProjectSummary])
def get_projects(current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(DBProject).filter(DBProject.owner_id == current_user.id).all()
    
    result = []
    for proj in projects:
        # Calculate completion percentage for the project based on estimated_minutes
        all_tasks = db.query(DBTask).join(DBPhase).filter(DBPhase.project_id == proj.id).all()
        total_minutes = sum([t.estimated_minutes for t in all_tasks])
        if total_minutes == 0:
            result.append(ProjectSummary(id=proj.id, title=proj.title, completion_percentage=0))
            continue
        
        completed_minutes = sum([t.estimated_minutes * (t.completion_percentage / 100.0) for t in all_tasks])
        proj_completion = int((completed_minutes / total_minutes) * 100)
        result.append(ProjectSummary(id=proj.id, title=proj.title, completion_percentage=proj_completion))
        
    return result

@app.get("/projects/{project_id}", response_model=RoadmapResponse)
def get_project_details(project_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(DBProject).filter(DBProject.id == project_id, DBProject.owner_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    roadmap = []
    for phase in proj.phases:
        tasks = []
        for task in phase.tasks:
            subtasks = []
            for st in task.subtasks:
                subtasks.append(SubTaskItem(
                    id=st.id, title=st.title, estimated_minutes=st.estimated_minutes, actionable_step=st.actionable_step,
                    coin_reward=st.coin_reward, completed=st.completed
                ))
            tasks.append(TaskItem(
                id=task.id, title=task.title, estimated_minutes=task.estimated_minutes,
                actionable_step=task.actionable_step, coin_reward=task.coin_reward,
                completed=task.completed, completion_percentage=task.completion_percentage,
                subtasks=subtasks
            ))
        roadmap.append(PhaseItem(id=phase.id, phase_name=phase.name, tasks=tasks))
        
    all_tasks_in_proj = []
    for p in proj.phases:
        all_tasks_in_proj.extend(p.tasks)
    
    total_minutes = sum([t.estimated_minutes for t in all_tasks_in_proj])
    completed_minutes = int(sum([t.estimated_minutes * (t.completion_percentage / 100.0) for t in all_tasks_in_proj]))
        
    return RoadmapResponse(
        id=proj.id, target=proj.title, duration=proj.duration, created_at=proj.created_at, 
        total_minutes=total_minutes, completed_minutes=completed_minutes, roadmap=roadmap
    )


@app.post("/generate-roadmap", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapRequest, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    total_minutes = request.duration * request.daily_time
    system_prompt = (
        "Sen DeepStep AI motorusun. Hedefi parçala ve SADECE şu JSON'u dön: "
        "{ 'roadmap': [ { 'phase_name': 'Aşama 1', 'tasks': [ "
        "{ 'title': 'Görev', 'estimated_minutes': 20, "
        "'actionable_step': 'Pratik, proje tabanlı tek cümlelik adım', 'coin_reward': 10 } ] } ] }\n"
        f"ÖNEMLİ: Bütün görevlerin 'estimated_minutes' değerlerinin toplamı TAM OLARAK {total_minutes} dakikaya eşit olmalıdır. Zamanı zorluğa göre dağıt."
    )
    
    user_prompt = (
        f"Hedef: {request.target}\n"
        f"Süre: {request.duration} gün\n"
        f"Günlük Vakit: {request.daily_time} dakika\n"
        f"Seviye: {request.level}"
    )

    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        result_json = {
            "roadmap": [
                {
                    "phase_name": "Mock Aşama 1: Hazırlık",
                    "tasks": [
                        {
                            "title": "Araştırma ve Planlama",
                            "estimated_minutes": 30,
                            "actionable_step": "Proje için gereken teknolojileri listele.",
                            "coin_reward": 15
                        }
                    ]
                }
            ]
        }
    else:
        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    # Save to Database
    db_proj = DBProject(
        title=request.target, duration=request.duration, daily_time=request.daily_time,
        level=request.level, owner_id=current_user.id
    )
    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)
    
    for p in result_json.get("roadmap", []):
        db_phase = DBPhase(name=p["phase_name"], project_id=db_proj.id)
        db.add(db_phase)
        db.commit()
        db.refresh(db_phase)
        
        for t in p.get("tasks", []):
            db_task = DBTask(
                title=t["title"], estimated_minutes=t.get("estimated_minutes", 30),
                actionable_step=t["actionable_step"], coin_reward=t["coin_reward"],
                phase_id=db_phase.id
            )
            db.add(db_task)
        db.commit()
        
    # Return the newly generated DB project
    return get_project_details(db_proj.id, current_user, db)


@app.post("/analyze-progress", response_model=ProgressResponse)
async def analyze_progress(request: ProgressRequest, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(DBTask).filter(DBTask.id == request.task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    remaining_coins = db_task.coin_reward
    remaining_minutes = int(db_task.estimated_minutes * ((100 - db_task.completion_percentage) / 100.0))
    # If it was partially completed before, adjusting remaining coins might be complex. 
    # For simplicity, we just use the original coin_reward to distribute for new subtasks.
    
    system_prompt = (
        "Kullanıcının yazdığı metne göre görevin durumunu analiz et. SADECE şu JSON'u dön:\n"
        "Eğer tamamen bittiyse (completed):\n"
        "{ 'status': 'completed', 'completion_percentage': 100, 'feedback': 'Harika, tamamladın!', 'next_action': 'close', 'subtasks': [] }\n"
        "Eğer kısmen bittiyse (partial, örneğin %70 tamamlandı):\n"
        "Kalan %30'luk kısım için toplamda kalan coin_reward'ı paylaştırarak küçük alt görevler üret.\n"
        "{ 'status': 'partial', 'completion_percentage': 70, 'feedback': 'Çok iyi başlangıç...', 'next_action': 'subtasks', 'subtasks': [ { 'title': 'Eksik Kısmı Tamamla', 'estimated_minutes': 15, 'actionable_step': 'Ne yapmalı...', 'coin_reward': 5 } ] }\n"
        f"Görevin toplam coin ödülü: {remaining_coins}. Alt görevlere dağıtılacak coin bu sayıyı geçmesin.\n"
        f"Kalan süre: {remaining_minutes} dakika. Alt görevlere dağıtılacak 'estimated_minutes' toplamı tam olarak bu sayıya eşit olsun."
    )
    
    user_prompt = (
        f"Görev: {db_task.title}\n"
        f"Beklenen Adım: {db_task.actionable_step}\n"
        f"Kullanıcı Metni: {request.user_text}"
    )

    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Mock Response
        result_json = {
            "status": "partial",
            "completion_percentage": 70,
            "feedback": "Mock: Harika! Ama %30 eksik kaldı, bunları alt görev ekliyorum.",
            "next_action": "subtasks",
            "subtasks": [
                {
                    "title": "Geri kalan tasarımı yap",
                    "actionable_step": "Buton renklerini düzenle.",
                    "coin_reward": int(remaining_coins * 0.3)
                }
            ]
        }
    else:
        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    # Process Results
    status_str = result_json.get("status", "completed")
    percentage = result_json.get("completion_percentage", 100)
    
    earned_coins = 0
    if status_str == "completed" or percentage == 100:
        if not db_task.completed:
            earned_coins = db_task.coin_reward
            db_task.completed = True
            db_task.completion_percentage = 100
            current_user.total_coins += earned_coins
    else:
        # Partial completion
        db_task.completion_percentage = percentage
        # Distribute partial coins
        earned_coins = int(db_task.coin_reward * (percentage / 100.0))
        # Ensure we don't reward multiple times redundantly for MVP
        current_user.total_coins += earned_coins
        
        # Add subtasks
        for st in result_json.get("subtasks", []):
            db_subtask = DBSubTask(
                title=st["title"],
                estimated_minutes=st.get("estimated_minutes", 10),
                actionable_step=st["actionable_step"],
                coin_reward=st["coin_reward"],
                task_id=db_task.id
            )
            db.add(db_subtask)

    db.commit()
    
    # Return response matching Pydantic
    subtasks_response = []
    for st in db_task.subtasks:
        subtasks_response.append(SubTaskItem(
            id=st.id, title=st.title, estimated_minutes=st.estimated_minutes, actionable_step=st.actionable_step,
            coin_reward=st.coin_reward, completed=st.completed
        ))

    return ProgressResponse(
        status=status_str,
        completion_percentage=percentage,
        feedback=result_json.get("feedback", ""),
        next_action=result_json.get("next_action", "close"),
        subtasks=subtasks_response,
        earned_coins=earned_coins
    )

@app.post("/complete-subtask")
def complete_subtask(subtask_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_subtask = db.query(DBSubTask).filter(DBSubTask.id == subtask_id).first()
    if not db_subtask or db_subtask.completed:
        return {"success": False}
        
    db_subtask.completed = True
    current_user.total_coins += db_subtask.coin_reward
    
    # Also update main task percentage if all subtasks are done (optional logic, kept simple)
    db.commit()
    return {"success": True, "earned_coins": db_subtask.coin_reward}
