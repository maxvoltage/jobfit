from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from weasyprint import HTML
from datetime import datetime, UTC
from typing import List

import logfire
from database import engine, Base, get_db
import models
import config
from tools import extract_text_from_pdf, scrape_job_description
from agent import resume_agent, resume_agent_no_tools

# Initialize Logfire for elegant AI monitoring
# send_to_logfire=False ensures it runs in local console mode without requiring an account/login
logfire.configure(send_to_logfire=False)
logfire.instrument_sqlalchemy(engine=engine)
logfire.instrument_pydantic_ai()
logfire.instrument_httpx()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JobFit API",
    description="AI-powered resume tailoring service",
    version="1.0.0"
)

logfire.instrument_fastapi(app)

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

class ResumeImportRequest(BaseModel):
    url: str
    name: str | None = None

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




class RegenerateRequest(BaseModel):
    prompt: str | None = None

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

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=content[:100] + "...",
        is_master=resume.is_master,
    )

@app.post("/api/resumes/import-url", response_model=ResumeResponse)
async def import_resume_from_url(
    request: ResumeImportRequest,
    db: Session = Depends(get_db)
):
    """Import a resume by scraping a URL (e.g. LinkedIn)."""
    print(f"DEBUG: Received import request for URL: {request.url}, name: {request.name}")
    
    # Scrape content using our tool
    content = await scrape_job_description(request.url)
    
    if content.startswith("Error:"):
        raise HTTPException(status_code=400, detail=content)
    
    if not content.strip():
        raise HTTPException(status_code=400, detail="The scraped resume content is empty.")
    
    # Set this as the master resume (latest) and demote previous ones
    db.query(models.Resume).update({models.Resume.is_master: False})
    
    # Save to database
    resume = models.Resume(
        name=request.name if request.name else f"Imported from {request.url[:30]}...",
        content=content,
        is_master=True
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    print(f"DEBUG: Successfully imported resume ID: {resume.id}, name: {resume.name}")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=content[:100] + "...",
        is_master=resume.is_master,
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


def extract_agent_data(result):
    """Robustly extract data from an agent result object, handling various formats."""
    print(f"DEBUG: Result Type: {type(result)}")
    
    # Log usage if available (token counts)
    try:
        if hasattr(result, 'usage'):
            usage = result.usage()
            # PydanticAI Usage object uses request_tokens and response_tokens
            total = getattr(usage, 'total_tokens', 0)
            request = getattr(usage, 'request_tokens', 0)
            response = getattr(usage, 'response_tokens', 0)
            print(f"DEBUG: AI Interaction Summary -> Tokens: {total} (Request: {request}, Response: {response})")
    except Exception as e:
        print(f"DEBUG: Could not extract usage info: {e}")

    # Try .data attribute (standard pydantic-ai)
    data = getattr(result, 'data', None)
    if data is not None:
        return data
        
    # Fallback to other common attributes
    for attr in ['result', 'output', 'content', 'message']:
        data = getattr(result, attr, None)
        if data is not None:
            print(f"DEBUG: Found data in .{attr} attribute")
            return data
            
    # If it's a string or has a .text (some versions/fallbacks)
    if hasattr(result, 'text'):
        print("DEBUG: Found data in .text attribute")
        return result.text
        
    print("DEBUG: Could not find structured data attribute. Returning result object itself.")
    return result

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
        
        # Robust data extraction
        data = extract_agent_data(result)
        
        # Save to Job table
        company = getattr(data, 'company_name', "Unknown Company")
        title = getattr(data, 'job_title', "Job Title")
        match_score = getattr(data, 'match_score', 0)
        
        # Fallback if AI didn't return them
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
    
@app.post("/api/jobs/{job_id}/regenerate")
async def regenerate_job_content(
    job_id: int,
    request: RegenerateRequest,
    db: Session = Depends(get_db)
):
    """Regenerate tailored resume and cover letter with optional user prompt."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    resume = db.query(models.Resume).filter(models.Resume.id == job.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Original resume not found")

    try:
        user_prompt = request.prompt or "Please regenerate the content."
        print(f"DEBUG: Regenerating job ID {job_id} with prompt: {user_prompt}")
        
        # Construct the context for the agent
        context = f"""
Original Job Description:
{job.original_jd or job.url}

Original Resume:
{resume.content}

Current Tailored Resume:
{job.tailored_resume}

Current Cover Letter:
{job.cover_letter}

User Request for Regeneration:
{user_prompt}

TASK:
1. Update the tailored resume (tailored_resume_html) following the user request.
2. Update the cover letter (cover_letter_html) accordingly.
3. Re-calculate the match score.
4. Keep the company name '{job.company}' and job title '{job.title}'.

Please provide the updated content in the required structured format.
"""
        # We use resume_agent_no_tools since we already have all the info
        result = await resume_agent_no_tools.run(context)
        data = extract_agent_data(result)
        
        if data:
            # Update only if the field is present in the data AND it's a valid primitive/string
            # Using str() or int() transformation to ensure it's not a MagicMock or other object
            new_resume = getattr(data, 'tailored_resume_html', None)
            new_cover = getattr(data, 'cover_letter_html', None)
            new_score = getattr(data, 'match_score', None)
            
            # Additional validation: if fields are mock objects, don't use them
            # This is important for both tests and production robustness
            if new_resume is not None and not hasattr(new_resume, '__call__'):
                job.tailored_resume = str(new_resume)
            if new_cover is not None and not hasattr(new_cover, '__call__'):
                job.cover_letter = str(new_cover)
            if new_score is not None and not hasattr(new_score, '__call__'):
                try:
                    job.match_score = int(new_score)
                except (ValueError, TypeError):
                    pass
            
            db.commit()
            db.refresh(job)
            
            return {
                "resume": job.tailored_resume,
                "coverLetter": job.cover_letter,
                "matchScore": job.match_score
            }
        else:
            print("ERROR: extract_agent_data returned None or empty result")
            raise HTTPException(status_code=500, detail="Failed to get data from agent")
            
    except Exception as e:
        import traceback
        print(f"ERROR: Regeneration failed: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")
