import datetime
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

SQLALCHEMY_DATABASE_URL = "sqlite:///./planflow.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    total_coins = Column(Integer, default=0)
    projects = relationship("DBProject", back_populates="owner")

class DBProject(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    duration = Column(Integer)
    daily_time = Column(Integer)
    level = Column(String)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("DBUser", back_populates="projects")
    phases = relationship("DBPhase", back_populates="project", cascade="all, delete-orphan")

class DBPhase(Base):
    __tablename__ = "phases"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("DBProject", back_populates="phases")
    tasks = relationship("DBTask", back_populates="phase", cascade="all, delete-orphan")

class DBTask(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    estimated_minutes = Column(Integer)
    actionable_step = Column(String)
    coin_reward = Column(Integer)
    completed = Column(Boolean, default=False)
    completion_percentage = Column(Integer, default=0)
    phase_id = Column(Integer, ForeignKey("phases.id"))
    phase = relationship("DBPhase", back_populates="tasks")
    subtasks = relationship("DBSubTask", back_populates="task", cascade="all, delete-orphan")

class DBSubTask(Base):
    __tablename__ = "subtasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    estimated_minutes = Column(Integer)
    actionable_step = Column(String)
    coin_reward = Column(Integer)
    completed = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    task = relationship("DBTask", back_populates="subtasks")
