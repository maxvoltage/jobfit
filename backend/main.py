from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from weasyprint import HTML
from datetime import datetime, UTC
from typing import List

from database import engine, Base, get_db
import models
import config
from tools import extract_text_from_pdf
from agent import resume_agent

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JobFit API",
    description="AI-powered resume tailoring service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class AnalyzeJobRequest(BaseModel):
    url: str
    resume_id: int

class ResumeResponse(BaseModel):
    id: int
    name: str
    preview: str
    is_master: bool

class JobResponse(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    resume_id: int
    url: str | None
    company: str
    title: str
    match_score: int
    status: str
    created_at: datetime



@app.get("/")
async def root():
    return {
        "message": "Welcome to JobFit API",
        "llm_model": config.LLM_NAME
    }


@app.post("/api/resumes/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a PDF resume and extract its content."""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file bytes
    file_bytes = await file.read()
    
    # Extract text using our tool
    content = extract_text_from_pdf(file_bytes)
    
    if content.startswith("Error:"):
        raise HTTPException(status_code=400, detail=content)
    
    # Save to database
    resume = models.Resume(
        name=file.filename.replace('.pdf', ''),
        content=content,
        is_master=False
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    # Create preview (first 200 chars)
    preview = content[:200] + "..." if len(content) > 200 else content
    
    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=preview,
        is_master=resume.is_master
    )


@app.post("/api/analyze")
async def analyze_job(
    request: AnalyzeJobRequest,
    db: Session = Depends(get_db)
):
    """Analyze a job posting and tailor the resume."""
    
    # Load resume from database
    resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Run the AI agent
    try:
        result = await resume_agent.run(
            f"Tailor this resume for the job at: {request.url}\n\nResume Content:\n{resume.content}"
        )
        
        # Save to Job table
        job = models.Job(
            resume_id=request.resume_id,
            url=request.url,
            company=result.data.key_improvements[0] if result.data.key_improvements else "Unknown Company",
            title="Job Title",  # Extract from result if needed
            original_jd="",  # Could be populated from scrape tool
            tailored_resume=result.data.tailored_resume_html,
            match_score=result.data.match_score,
            status=models.JobStatus.todo,
            created_at=datetime.now(UTC)
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return {
            "job_id": job.id,
            "score": job.match_score,
            "company": job.company,
            "tailored_resume": job.tailored_resume
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/jobs", response_model=List[JobResponse])
async def get_jobs(db: Session = Depends(get_db)):
    """Get all job applications."""
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    return jobs


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get a specific job application."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/api/jobs/{job_id}/pdf")
async def generate_pdf(
    job_id: int,
    pdf_type: str = "resume",  # "resume" or "cover"
    db: Session = Depends(get_db)
):
    """Generate a PDF from the tailored resume or cover letter."""
    
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get the HTML content
    html_content = job.tailored_resume
    
    if not html_content:
        raise HTTPException(status_code=400, detail="No content available for PDF generation")
    
    # Generate PDF using WeasyPrint
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Return as downloadable file
        filename = f"{job.company}_{job.title}_{pdf_type}.pdf".replace(" ", "_")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Delete a job application."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}
