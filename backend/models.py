from sqlalchemy import ForeignKey, String, Integer, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
import enum
from database import Base

class JobStatus(str, enum.Enum):
    todo = "todo"
    applied = "applied"
    interview = "interview"

class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str]
    content: Mapped[str]
    is_master: Mapped[bool] = mapped_column(default=False)
    
    # Relationship to Jobs
    jobs: Mapped[List["Job"]] = relationship(back_populates="resume", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    url: Mapped[Optional[str]]
    company: Mapped[str]
    title: Mapped[str]
    original_jd: Mapped[str]
    tailored_resume: Mapped[str]
    match_score: Mapped[int]
    status: Mapped[JobStatus] = mapped_column(SQLEnum(JobStatus), default=JobStatus.todo)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to Resume
    resume: Mapped["Resume"] = relationship(back_populates="jobs")
