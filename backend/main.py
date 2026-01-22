from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
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
from agent import resume_agent, resume_agent_no_tools

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
    allow_origins=["http://localhost:8080", "http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class AnalyzeJobRequest(BaseModel):
    url: str | None = None
    description: str | None = None
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
    cover_letter: str | None = None
    created_at: datetime



@app.get("/")
async def root():
    import os
    print(f"DEBUG: Using database at: {config.DATABASE_URL}")
    print(f"DEBUG: Current working directory: {os.getcwd()}")
    return {
        "message": "Welcome to JobFit API",
        "llm_model": config.LLM_NAME,
        "database_url": config.DATABASE_URL
    }


@app.post("/api/resumes/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    name: str = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a PDF resume and extract its content."""
    print(f"DEBUG: Received upload request for file: {file.filename}, name: {name}")
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file bytes
    file_bytes = await file.read()
    
    # Extract text using our tool
    content = extract_text_from_pdf(file_bytes)
    
    if content.startswith("Error:"):
        raise HTTPException(status_code=400, detail=content)
    
    if not content.strip():
        raise HTTPException(status_code=400, detail="The extracted resume content is empty. Please ensure the PDF is not scanned or empty.")
    
    # Set this as the master resume (latest) and demote previous ones
    db.query(models.Resume).update({models.Resume.is_master: False})
    
    # Save to database
    resume = models.Resume(
        name=name if name else file.filename.replace('.pdf', ''),
        content=content,
        is_master=True
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    print(f"DEBUG: Successfully saved resume ID: {resume.id}, name: {resume.name}")
    
    # Create preview (first 200 chars)
    preview = content[:200] + "..." if len(content) > 200 else content
    
    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=preview,
        is_master=resume.is_master
    )


@app.get("/api/resumes", response_model=List[ResumeResponse])
async def get_resumes(db: Session = Depends(get_db)):
    """Get all uploaded resumes."""
    resumes = db.query(models.Resume).all()
    
    results = []
    for r in resumes:
        preview = r.content[:200] + "..." if len(r.content) > 200 else r.content
        results.append(ResumeResponse(
            id=r.id,
            name=r.name,
            preview=preview,
            is_master=r.is_master
        ))
    
    return results


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
        if request.description:
            job_input = f"the job description: {request.description}"
            print(f"DEBUG: Starting AI analysis (Manual Mode) for resume ID {request.resume_id}...")
            # Use no-tools agent for manual entry to avoid tool call errors
            result = await resume_agent_no_tools.run(
                f"Tailor this resume for {job_input}\n\nResume Content:\n{resume.content}"
            )
        else:
            print(f"DEBUG: Starting AI analysis (URL Mode) for resume ID {request.resume_id} and URL: {request.url}")
            result = await resume_agent.run(
                f"Tailor this resume for the job at: {request.url}\n\nResume Content:\n{resume.content}"
            )
        
        # DEBUG: Exhaustive inspection
        print(f"DEBUG: Result Type: {type(result)}")
        print(f"DEBUG: Result Dir: {dir(result)}")
        try:
            print(f"DEBUG: Result Data (attr): {result.data if hasattr(result, 'data') else 'N/A'}")
        except Exception as e:
            print(f"DEBUG: Error accessing result.data: {e}")

        # Get the data from the result
        data = getattr(result, 'data', None)
        if data is None:
             # Fallback check for common patterns in AI libraries
             for attr in ['result', 'output', 'content', 'message']:
                 data = getattr(result, attr, None)
                 if data: break
        
        if data is None:
            print("ERROR: Could not find data attribute in Result object. Using result object directly as last resort.")
            data = result
            
        print(f"DEBUG: Data Type: {type(data)}")
        print(f"DEBUG: Data Attributes: {[a for a in dir(data) if not a.startswith('_')]}")
        
        # Save to Job table
        # Use getattr for everything to prevent crashes while debugging
        match_score = getattr(data, 'match_score', 0)
        company = getattr(data, 'company_name', "Unknown Company")
        title = getattr(data, 'job_title', "Job Title")
        
        # Fallback if AI didn't return them (for older models/versions)
        if company == "Unknown Company":
            improvements = getattr(data, 'key_improvements', [])
            if improvements and len(improvements) > 0:
                company = improvements[0]
            
        job = models.Job(
            resume_id=request.resume_id,
            url=request.url,
            company=company,
            title=title, 
            original_jd=request.description or "", 
            tailored_resume=getattr(data, 'tailored_resume_html', ""),
            cover_letter=getattr(data, 'cover_letter_html', ""),
            match_score=match_score,
            status=models.JobStatus.todo,
            created_at=datetime.now(UTC)
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        print(f"DEBUG: Successfully saved job application ID: {job.id} for company: {job.company}")
        
        return {
            "job_id": job.id,
            "score": job.match_score,
            "company": job.company,
            "tailored_resume": job.tailored_resume,
            "cover_letter": job.cover_letter
        }
        
    except Exception as e:
        import traceback
        print(f"ERROR: Analysis failed with exception: {str(e)}")
        print(traceback.format_exc())
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


class UpdateJobRequest(BaseModel):
    status: str | None = None
    applied: bool | None = None

@app.patch("/api/jobs/{job_id}")
async def update_job(
    job_id: int, 
    request: UpdateJobRequest,
    db: Session = Depends(get_db)
):
    """Update a job application."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if request.status is not None:
        job.status = request.status
    if request.applied is not None:
        # Map boolean applied to status if needed, or keep separate
        if request.applied:
            job.status = models.JobStatus.applied
    
    db.commit()
    db.refresh(job)
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
