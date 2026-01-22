import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import io
from models import Resume, Job, JobStatus
from agent import ResumeMatchResult

"""
Tests for the JobFit API using the improved pattern with pytest fixtures.
Fixtures like 'client', 'db_session', 'sample_resume', and 'sample_job' 
are provided by tests/conftest.py.
"""

class TestRootEndpoint:
    """Test the root endpoint."""
    
    def test_root_returns_welcome_message(self, client):
        """Test that root endpoint returns welcome message."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "JobFit" in data["message"]
        assert "llm_model" in data


class TestResumeUpload:
    """Test resume upload endpoint."""
    
    def test_upload_valid_pdf(self, client):
        """Test uploading a valid PDF file."""
        # Create a minimal PDF
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF"
        
        with patch('main.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = "# John Doe\nSoftware Engineer with 5 years experience..."
            
            files = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
            response = client.post("/api/resumes/upload", files=files)
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "resume"
            assert "preview" in data
            assert data["is_master"] is True
            assert "id" in data
    
    def test_upload_non_pdf_file(self, client):
        """Test that non-PDF files are rejected."""
        files = {"file": ("document.txt", io.BytesIO(b"text content"), "text/plain")}
        response = client.post("/api/resumes/upload", files=files)
        
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"]
    
    def test_upload_pdf_extraction_error(self, client):
        """Test handling of PDF extraction errors."""
        pdf_content = b"%PDF-1.4\n%%EOF"
        
        with patch('main.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = "Error: Failed to extract text"
            
            files = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
            response = client.post("/api/resumes/upload", files=files)
            
            assert response.status_code == 400
            assert "Error" in response.json()["detail"]

    def test_import_resume_from_url(self, client):
        """Test importing a resume from a URL."""
        with patch('main.scrape_job_description', new_callable=AsyncMock) as mock_scrape:
            mock_scrape.return_value = "# Imported Resume Content"
            
            payload = {"url": "https://linkedin.com/in/test", "name": "LinkedIn Bio"}
            response = client.post("/api/resumes/import-url", json=payload)
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "LinkedIn Bio"
            assert data["is_master"] is True
            assert "# Imported" in data["preview"]


class TestAnalyzeJob:
    """Test job analysis endpoint."""
    
    def test_analyze_job_success(self, client, sample_resume):
        """Test successful job analysis."""
        # Mock the agent response
        mock_result = MagicMock()
        mock_result.data = ResumeMatchResult(
            match_score=85,
            tailored_resume_html="<h1>Tailored Resume</h1>",
            cover_letter_html="<p>Cover letter</p>",
            company_name="Test Company",
            job_title="Software Engineer",
            key_improvements=["Added Python skills", "Emphasized leadership"]
        )
        
        with patch('main.resume_agent.run', new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result
            
            response = client.post(
                "/api/analyze",
                json={"url": "https://example.com/job", "resume_id": sample_resume.id}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["score"] == 85
            assert "job_id" in data
            assert "company" in data
    
    def test_analyze_job_resume_not_found(self, client):
        """Test analysis with non-existent resume."""
        response = client.post(
            "/api/analyze",
            json={"url": "https://example.com/job", "resume_id": 9999}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_analyze_job_agent_failure(self, client, sample_resume):
        """Test handling of agent failures."""
        with patch('main.resume_agent.run', new_callable=AsyncMock) as mock_agent:
            mock_agent.side_effect = Exception("Agent error")
            
            response = client.post(
                "/api/analyze",
                json={"url": "https://example.com/job", "resume_id": sample_resume.id}
            )
            
            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()


class TestGetJobs:
    """Test job listing endpoint."""
    
    def test_get_jobs_empty_list(self, client):
        """Test getting jobs when none exist."""
        response = client.get("/api/jobs")
        
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_jobs_with_data(self, client, sample_job):
        """Test getting jobs with existing data."""
        # sample_job fixture already provides one job
        response = client.get("/api/jobs")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["company"] == "Test Company"


class TestGetJob:
    """Test single job retrieval endpoint."""
    
    def test_get_job_success(self, client, sample_job):
        """Test getting a specific job."""
        response = client.get(f"/api/jobs/{sample_job.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["company"] == "Test Company"
        assert data["match_score"] == 85
    
    def test_get_job_not_found(self, client):
        """Test getting a non-existent job."""
        response = client.get("/api/jobs/9999")
        
        assert response.status_code == 404


class TestGeneratePDF:
    """Test PDF generation endpoint."""
    
    def test_generate_pdf_success(self, client, sample_job):
        """Test successful PDF generation."""
        with patch('main.HTML') as mock_html:
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.write_pdf.return_value = b"PDF content"
            mock_html.return_value = mock_pdf_instance
            
            response = client.post(f"/api/jobs/{sample_job.id}/pdf")
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert "attachment" in response.headers["content-disposition"]
    
    def test_generate_pdf_job_not_found(self, client):
        """Test PDF generation for non-existent job."""
        response = client.post("/api/jobs/9999/pdf")
        
        assert response.status_code == 404
    
    def test_generate_pdf_no_content(self, client, db_session, sample_resume):
        """Test PDF generation when no content exists."""
        # Create a job with empty tailored_resume
        job = Job(
            resume_id=sample_resume.id,
            url="https://example.com/job",
            company="Test Company",
            title="Engineer",
            original_jd="JD",
            tailored_resume="",  # Empty content
            cover_letter="",
            match_score=90,
            status=JobStatus.todo
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        
        response = client.post(f"/api/jobs/{job.id}/pdf")
        
        assert response.status_code == 400
        assert "No content" in response.json()["detail"]


class TestDeleteJob:
    """Test job deletion endpoint."""
    
    def test_delete_job_success(self, client, sample_job, db_session):
        """Test successful job deletion."""
        job_id = sample_job.id
        
        response = client.delete(f"/api/jobs/{job_id}")
        
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify job is actually deleted
        deleted_job = db_session.query(Job).filter(Job.id == job_id).first()
        assert deleted_job is None
    
    def test_delete_job_not_found(self, client):
        """Test deleting a non-existent job."""
        response = client.delete("/api/jobs/9999")
        
        assert response.status_code == 404
