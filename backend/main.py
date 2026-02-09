import os
import traceback
from datetime import UTC, datetime
from typing import List

import logfire
import markdown
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from weasyprint import HTML

import config
import models
from agent import clean_resume_agent, resume_agent, resume_agent_no_tools
from database import Base, engine, get_db
from logger import log_ai_interaction, log_debug, log_error, log_requests_middleware
from migrations import run_migrations
from prompts import get_initial_tailoring_prompt, get_regeneration_prompt
from tools import extract_text_from_pdf, scrape_job_description

# Initialize Logfire for elegant AI monitoring
# send_to_logfire=False ensures it runs in local console mode without requiring an account/login
logfire.configure(send_to_logfire=False)
logfire.instrument_sqlalchemy(engine=engine)
logfire.instrument_pydantic_ai()
logfire.instrument_httpx()

# Run SQLite migrations if needed before starting
run_migrations()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobFit API", description="AI-powered resume tailoring service", version="1.0.0")

logfire.instrument_fastapi(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register logging middleware
app.middleware("http")(log_requests_middleware)


# Pydantic models for request/response
class AnalyzeJobRequest(BaseModel):
    url: str | None = None
    description: str | None = None
    resume_id: int


class ResumeResponse(BaseModel):
    id: int
    name: str
    preview: str
    is_selected: bool


class ResumeImportRequest(BaseModel):
    url: str
    name: str | None = None


class ResumeManualRequest(BaseModel):
    content: str
    name: str | None = None


class ResumeUpdateRequest(BaseModel):
    name: str
    content: str
    is_selected: bool


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


@app.get("/api/health")
async def health_check():
    import os

    log_debug(f"Using database at: {config.DATABASE_URL}")
    log_debug(f"Current working directory: {os.getcwd()}")
    return {"message": "Welcome to JobFit API", "online": True}


def extract_agent_data(result):
    """Robustly extract data from an agent result object, handling various formats."""
    log_debug(f"Result Type: {type(result)}")

    # Log usage if available (token counts)
    try:
        if hasattr(result, "usage"):
            usage = result.usage()
            # PydanticAI Usage object uses request_tokens and response_tokens
            total = getattr(usage, "total_tokens", 0)
            request = getattr(usage, "request_tokens", 0)
            response = getattr(usage, "response_tokens", 0)
            log_debug(f"AI Interaction Summary -> Tokens: {total} (Request: {request}, Response: {response})")
    except Exception as e:
        log_debug(f"Could not extract usage info: {e}")

    # Try .output or .data attribute (standard pydantic-ai result locations)
    for attr in ["output", "data"]:
        data = getattr(result, attr, None)
        if data is not None:
            return data

    # Fallback to other common attributes
    for attr in ["result", "content", "message"]:
        data = getattr(result, attr, None)
        if data is not None:
            log_debug(f"Found data in .{attr} attribute")
            return data

    # If it's a string or has a .text (some versions/fallbacks)
    if hasattr(result, "text"):
        log_debug("Found data in .text attribute")
        return result.text

    log_debug("Could find no structured data attribute. Returning result object itself.")
    return result


@app.post("/api/resumes/upload", response_model=ResumeResponse)
async def upload_resume(file: UploadFile = File(...), name: str = Form(None), db: Session = Depends(get_db)):
    """Upload a PDF resume and extract its content."""
    log_debug(f"Received upload request for file: {file.filename}, name: {name}")

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read file bytes
    file_bytes = await file.read()

    # Extract text using our tool
    content = extract_text_from_pdf(file_bytes)

    if content.startswith("Error:"):
        raise HTTPException(status_code=400, detail=content)

    if not content.strip() or len(content.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail=("The extracted resume content is insufficient. Please ensure the PDF is not scanned or empty."),
        )

    # Set this as the currently selected resume and deselect previous ones
    db.query(models.Resume).update({models.Resume.is_selected: False})

    # Save to database
    resume = models.Resume(name=name if name else file.filename.replace(".pdf", ""), content=content, is_selected=True)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    log_debug(f"Successfully saved resume ID: {resume.id}, name: {resume.name}")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=content[:100] + "...",
        is_selected=resume.is_selected,
    )


@app.post("/api/resumes/import-url", response_model=ResumeResponse)
async def import_resume_from_url(request: ResumeImportRequest, db: Session = Depends(get_db)):
    """Import a resume by scraping a URL (e.g. LinkedIn)."""
    log_debug(f"Received import request for URL: {request.url}, name: {request.name}")

    # Scrape content using our tool
    content = await scrape_job_description(request.url)

    if content.startswith("Error:"):
        raise HTTPException(status_code=400, detail=content)

    if not content.strip() or len(content.strip()) < 50:
        raise HTTPException(status_code=400, detail="The scraped resume content is insufficient.")

    # Set this as the currently selected resume and deselect previous ones
    db.query(models.Resume).update({models.Resume.is_selected: False})

    # Save to database
    resume = models.Resume(
        name=request.name if request.name else f"Imported from {request.url[:30]}...", content=content, is_selected=True
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    log_debug(f"Successfully imported resume ID: {resume.id}, name: {resume.name}")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=content[:100] + "...",
        is_selected=resume.is_selected,
    )


@app.post("/api/resumes/manual", response_model=ResumeResponse)
async def add_resume_manual(request: ResumeManualRequest, db: Session = Depends(get_db)):
    """Clean and save a manually pasted resume."""
    log_debug(f"📄 MANUAL RESUME START: {request.name}")

    if not request.content.strip() or len(request.content.strip()) < 50:
        raise HTTPException(status_code=400, detail="The pasted resume content is too short.")

    # Use the cleaning agent to format the text to Markdown
    try:
        log_ai_interaction("CLEAN RESUME REQUEST", request.content, "blue")
        result = await clean_resume_agent.run(request.content)
        cleaned_content = extract_agent_data(result)
        log_ai_interaction("CLEAN RESUME RESPONSE", cleaned_content, "green")

        # Strip markdown code fences if present (AI sometimes wraps in ```markdown```)
        cleaned_content = cleaned_content.strip()
        if cleaned_content.startswith("```markdown") or cleaned_content.startswith("```"):
            lines = cleaned_content.split("\n")
            # Remove first line if it's a code fence
            if lines[0].startswith("```"):
                lines.pop(0)
            # Remove last line if it's a closing fence
            if lines and lines[-1].strip() == "```":
                lines.pop()
            cleaned_content = "\n".join(lines)

    except Exception as e:
        log_error(f"Resume cleaning failed: {str(e)}")
        log_debug(f"Full Error Traceback:\n{traceback.format_exc()}")
        # Fallback to raw content if cleaning fails
        cleaned_content = request.content

    # Set this as the currently selected resume and deselect previous ones
    db.query(models.Resume).update({models.Resume.is_selected: False})

    # Save to database
    resume = models.Resume(
        name=request.name if request.name else f"Pasted Resume {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        content=cleaned_content,
        is_selected=True,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    log_debug(f"Successfully saved pasted resume ID: {resume.id}, name: {resume.name}")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=cleaned_content[:100] + "...",
        is_selected=resume.is_selected,
    )


@app.get("/api/resumes", response_model=List[ResumeResponse])
async def get_resumes(db: Session = Depends(get_db)):
    """Get all uploaded resumes."""
    resumes = db.query(models.Resume).order_by(models.Resume.updated_at.desc()).all()

    results = []
    for r in resumes:
        # Return full content for viewing/editing in the modal
        results.append(ResumeResponse(id=r.id, name=r.name, preview=r.content, is_selected=r.is_selected))

    return results


@app.put("/api/resumes/{resume_id}", response_model=ResumeResponse)
async def update_resume(resume_id: int, request: ResumeUpdateRequest, db: Session = Depends(get_db)):
    """Update an existing resume."""
    log_debug(f"Updating resume ID: {resume_id}")

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Update fields
    resume.name = request.name
    resume.content = request.content
    resume.updated_at = datetime.now(UTC)  # Manually update timestamp

    # If setting this as selected, deselect all others
    if request.is_selected and not resume.is_selected:
        db.query(models.Resume).update({models.Resume.is_selected: False})

    resume.is_selected = request.is_selected

    db.commit()
    db.refresh(resume)

    log_debug(f"Successfully updated resume ID: {resume.id}")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=resume.content,  # Return full content
        is_selected=resume.is_selected,
    )


@app.post("/api/resumes/{resume_id}/select", response_model=ResumeResponse)
async def set_selected_resume(resume_id: int, db: Session = Depends(get_db)):
    """Set a resume as the currently selected one."""
    log_debug(f"Setting resume ID {resume_id} as selected")

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Deselect all other resumes
    db.query(models.Resume).update({models.Resume.is_selected: False})

    # Select this one
    resume.is_selected = True
    resume.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(resume)

    log_debug(f"Resume ID {resume_id} is now the selected resume")

    return ResumeResponse(
        id=resume.id,
        name=resume.name,
        preview=resume.content,
        is_selected=resume.is_selected,
    )


@app.get("/api/resumes/{resume_id}/pdf")
async def generate_resume_pdf(resume_id: int, db: Session = Depends(get_db)):
    """Generate a PDF from an uploaded resume (Markdown content)."""
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    import re

    # Ensure blank line before lists to help Markdown parser identify them
    # This specifically looks for a non-list line followed by a line starting with a bullet (- or * followed by space)
    content = resume.content
    content = re.sub(r"(?m)^(?!\s*[-*+]\s)(.+)\r?\n\s*([-*+]\s+)", r"\1\n\n\2", content)

    # Convert Markdown to HTML with extra features, newline-to-break, and sane list detection
    html_content = markdown.markdown(content, extensions=["extra", "nl2br", "sane_lists", "smarty"])

    # Wrap in basic HTML structure with consistent styling for better PDF look
    styled_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ size: A4; margin: 2cm; }}
            body {{ font-family: 'Georgia', serif; font-size: 11pt; line-height: 1.5; color: #333; }}
            h1, h2, h3, p, ul {{ margin: 0; }}
            h1 {{ font-size: 24pt; margin-bottom: 0.2em; color: #1a1a1a; }}
            h2 {{ font-size: 14pt; margin-top: 1.2em; margin-bottom: 0.4em; border-bottom: 1px solid #ccc;
                padding-bottom: 0.1em; }}
            h3 {{ font-size: 12pt; margin-top: 1em; margin-bottom: 0.05em; }}
            p {{ margin-bottom: 0.6em; }}
            ul {{ margin-top: 0.2em; margin-bottom: 0.8em; padding-left: 1.5em; list-style-type: disc; }}
            li {{ margin-bottom: 0.3em; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    try:
        pdf_bytes = HTML(string=styled_html).write_pdf()

        safe_filename = re.sub(r"[^\w\.\-]", "_", f"{resume.name}.pdf")
        log_debug(f"Successfully generated PDF for resume: {safe_filename} ({len(pdf_bytes)} bytes)")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Length": str(len(pdf_bytes)),
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        log_error(f"Resume PDF generation failed: {str(e)}")
        log_debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.post("/api/analyze")
async def analyze_job(request: AnalyzeJobRequest, db: Session = Depends(get_db)):
    """Analyze a job posting and tailor the resume."""

    # Load resume from database
    resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Run the AI agent
    try:
        if request.description:
            prompt = get_initial_tailoring_prompt(
                resume_content=resume.content, job_source="the provided text", job_content=request.description
            )
            log_ai_interaction("AI REQUEST (MANUAL)", prompt, "blue")

            # Use no-tools agent for manual entry to avoid tool call errors
            result = await resume_agent_no_tools.run(prompt)
        else:
            prompt = get_initial_tailoring_prompt(resume.content, request.url)
            log_ai_interaction("AI REQUEST (URL)", prompt, "blue")

            result = await resume_agent.run(prompt)

        # Robust data extraction
        data = extract_agent_data(result)

        # Log response nicely
        import json

        # Log response nicely with more detail
        # Safe stringification of values to handle MagicMocks in tests
        response_preview = {
            "company": str(getattr(data, "company_name", "N/A")),
            "title": str(getattr(data, "job_title", "N/A")),
            "score": str(getattr(data, "match_score", 0)),
            "improvements": [str(i) for i in getattr(data, "key_improvements", [])],
            "extracted_jd": str(getattr(data, "extracted_job_description", "")),
            "resume_html": str(getattr(data, "tailored_resume_html", "")),
            "cover_letter_html": str(getattr(data, "cover_letter_html", "")),
        }
        log_ai_interaction("AI RESPONSE", json.dumps(response_preview, indent=2), "green", format="json")

        # Save to Job table
        company = getattr(data, "company_name", "Unknown Company")
        title = getattr(data, "job_title", "Job Title")
        match_score = getattr(data, "match_score", 0)
        extracted_jd = getattr(data, "extracted_job_description", "")

        # VALIDATION: If we couldn't get a real JD, don't save
        if not extracted_jd or "Error:" in extracted_jd or len(extracted_jd.strip()) < 50:
            log_error(f"Validation failed: Extracted JD is invalid or too short. Content: {extracted_jd[:100]}...")
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract a valid job description. "
                    "The source might be empty, mostly graphics, or protected."
                ),
            )

        # Fallback if AI didn't return them
        if company == "Unknown Company":
            improvements = getattr(data, "key_improvements", [])
            if improvements and len(improvements) > 0:
                company = improvements[0]

        job = models.Job(
            resume_id=request.resume_id,
            url=request.url,
            company=company,
            title=title,
            original_jd=getattr(data, "extracted_job_description", request.description or ""),
            tailored_resume=getattr(data, "tailored_resume_html", ""),
            cover_letter=getattr(data, "cover_letter_html", ""),
            match_score=match_score,
            status=models.JobStatus.todo,
            created_at=datetime.now(UTC),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        log_debug(f"Successfully saved job application ID: {job.id} for company: {job.company}")

        return {
            "job_id": job.id,
            "score": job.match_score,
            "company": job.company,
            "tailored_resume": job.tailored_resume,
            "cover_letter": job.cover_letter,
        }

    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Analysis failed with exception: {str(e)}")
        log_debug(traceback.format_exc())
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
    tailored_resume: str | None = None
    cover_letter: str | None = None


@app.patch("/api/jobs/{job_id}")
async def update_job(job_id: int, request: UpdateJobRequest, db: Session = Depends(get_db)):
    """Update a job application."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if request.status is not None:
        job.status = request.status
    elif request.applied is not None:
        if request.applied:
            job.status = models.JobStatus.applied
        elif job.status == models.JobStatus.applied:
            # If unticked and was previously 'applied', revert to 'todo'
            job.status = models.JobStatus.todo

    if request.tailored_resume is not None:
        job.tailored_resume = request.tailored_resume
    if request.cover_letter is not None:
        job.cover_letter = request.cover_letter

    db.commit()
    db.refresh(job)
    return job


@app.get("/api/jobs/{job_id}/pdf")
async def generate_pdf(
    job_id: int,
    pdf_type: str = "resume",  # "resume" or "cover"
    db: Session = Depends(get_db),
):
    """Generate a PDF from the tailored resume or cover letter."""

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get the HTML content
    if pdf_type == "cover":
        html_content = job.cover_letter
        log_debug(f"Generating PDF for cover letter (Job ID: {job_id})")
    else:
        html_content = job.tailored_resume
        log_debug(f"Generating PDF for tailored resume (Job ID: {job_id})")

    if not html_content:
        log_error(f"PDF generation aborted: No {pdf_type} content found for Job ID {job_id}")
        raise HTTPException(status_code=400, detail=f"No {pdf_type} content available for PDF generation")

    # Generate PDF using WeasyPrint
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()

        # Return as downloadable file
        import re

        raw_filename = f"{job.company}_{job.title}_{pdf_type}.pdf"
        # Replace spaces and other special characters with underscores
        safe_filename = re.sub(r"[^\w\.\-]", "_", raw_filename)
        log_debug(f"Successfully generated PDF: {safe_filename} ({len(pdf_bytes)} bytes)")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Length": str(len(pdf_bytes)),
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )

    except Exception as e:
        log_error(f"PDF generation failed for Job ID {job_id}: {str(e)}")
        log_debug(traceback.format_exc())
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
async def regenerate_job_content(job_id: int, request: RegenerateRequest, db: Session = Depends(get_db)):
    """Regenerate tailored resume and cover letter with optional user prompt."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume = db.query(models.Resume).filter(models.Resume.id == job.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Original resume not found")

    try:
        user_prompt = request.prompt or "Please regenerate the content."

        # Construct the context for the agent using the template
        context = get_regeneration_prompt(
            resume_content=resume.content,
            job_description=job.original_jd or job.url,
            current_tailored=job.tailored_resume,
            current_cover=job.cover_letter,
            user_request=user_prompt,
            company=job.company,
            title=job.title,
        )
        log_ai_interaction("REGENERATE REQUEST", context, "cyan")

        # We use resume_agent_no_tools since we already have all the info
        result = await resume_agent_no_tools.run(context)
        data = extract_agent_data(result)

        if data:
            # Log response nicely
            import json

            # Log response nicely
            # Safe stringification of values to handle MagicMocks in tests
            response_preview = {
                "score": str(getattr(data, "match_score", "N/A")),
                "resume_html": str(getattr(data, "tailored_resume_html", "")),
                "cover_letter_html": str(getattr(data, "cover_letter_html", "")),
            }
            log_ai_interaction("REGENERATE RESPONSE", json.dumps(response_preview, indent=2), "green", format="json")
            # Update only if the field is present in the data AND it's a valid primitive/string
            # Using str() or int() transformation to ensure it's not a MagicMock or other object
            new_resume = getattr(data, "tailored_resume_html", None)
            new_cover = getattr(data, "cover_letter_html", None)
            new_score = getattr(data, "match_score", None)

            # Additional validation: if fields are mock objects, don't use them
            # This is important for both tests and production robustness
            if new_resume is not None and not hasattr(new_resume, "__call__"):
                job.tailored_resume = str(new_resume)
            if new_cover is not None and not hasattr(new_cover, "__call__"):
                job.cover_letter = str(new_cover)
            if new_score is not None and not hasattr(new_score, "__call__"):
                try:
                    job.match_score = int(new_score)
                except (ValueError, TypeError):
                    pass

            db.commit()
            db.refresh(job)

            return {"resume": job.tailored_resume, "coverLetter": job.cover_letter, "matchScore": job.match_score}
        else:
            log_error("extract_agent_data returned None or empty result")
            raise HTTPException(status_code=500, detail="Failed to get data from agent")

    except Exception as e:
        log_error(f"Regeneration failed: {str(e)}")
        log_debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")


# Serve Static Files (Frontend)
# This allows the combined Docker container to serve the React app
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="assets")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        # If the path starts with api/, it's a 404
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")

        file_path = os.path.join(static_path, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(static_path, "index.html"))
