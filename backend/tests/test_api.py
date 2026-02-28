import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agent import JDExtractionResult, ResumeMatchResult
from models import Job, JobStatus

"""
Tests for the JobFit API using the improved pattern with pytest fixtures.
Fixtures like 'client', 'db_session', 'sample_resume', and 'sample_job'
are provided by tests/conftest.py.
"""


class TestRootEndpoint:
    """Test the root endpoint."""

    def test_root_returns_welcome_message(self, client):
        """Test that health endpoint returns welcome message."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "JobFit" in data["message"]


class TestResumeUpload:
    """Test resume upload endpoint."""

    def test_upload_valid_pdf(self, client):
        """Test uploading a valid PDF file."""
        # Create a minimal PDF
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF"

        with patch("main.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = (
                "John Doe is a Software Engineer with 10 years of experience in Python, FastAPI, and React. "
                "He has worked at several top tech companies and has a proven track record of "
                "delivering high-quality software."
            )

            files = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
            response = client.post("/api/resumes/upload", files=files)

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "resume"
            assert "preview" in data
            assert data["is_selected"] is True
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

        with patch("main.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = "Error: Failed to extract text"

            files = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
            response = client.post("/api/resumes/upload", files=files)

            assert response.status_code == 400
            assert "Error" in response.json()["detail"]

    def test_upload_insufficient_content(self, client):
        """Test handling of PDF with very little text."""
        pdf_content = b"%PDF-1.4\n%%EOF"

        with patch("main.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = "Short text"  # Less than 50 chars

            files = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
            response = client.post("/api/resumes/upload", files=files)

            assert response.status_code == 400
            assert "insufficient" in response.json()["detail"].lower()

    def test_import_resume_from_url(self, client):
        """Test importing a resume from a URL."""
        with patch("main.scrape_job_description", new_callable=AsyncMock) as mock_scrape:
            mock_scrape.return_value = (
                "This is a sufficiently long imported resume content that should pass the "
                "validation check in the API endpoint."
            )

            payload = {"url": "https://linkedin.com/in/test", "name": "LinkedIn Bio"}
            response = client.post("/api/resumes/import-url", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "LinkedIn Bio"
            assert data["is_selected"] is True
            assert "sufficiently long" in data["preview"]


class TestResumeManual:
    """Test resume manual entry endpoint."""

    @pytest.mark.asyncio
    async def test_add_resume_manual_success(self, client):
        """Test adding a valid resume text manually."""
        # Mock the cleaning agent
        mock_result = MagicMock()
        mock_result.output = (
            "# John Doe\n\n"
            "## Experience\n"
            "- Software Engineer with 10 years of experience in Python, FastAPI, and React."
        )

        with patch("main.clean_resume_agent.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            payload = {
                "content": (
                    "John Doe. Software Engineer with 10 years of experience in Python, FastAPI, and React. "
                    "He has worked at several top tech companies and has a proven track record of "
                    "delivering high-quality software."
                ),
                "name": "My Manual Resume",
            }
            response = client.post("/api/resumes/manual", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "My Manual Resume"
            assert "# John Doe" in data["preview"]
            assert data["is_selected"] is True

    def test_add_resume_manual_too_short(self, client):
        """Test adding a resume that is too short."""
        payload = {"content": "Too short", "name": "Shorty"}
        response = client.post("/api/resumes/manual", json=payload)

        assert response.status_code == 400
        assert "too short" in response.json()["detail"].lower()


class TestAnalyzeJob:
    """Test job analysis endpoint."""

    def test_analyze_job_success(self, client, sample_resume):
        """Test successful job analysis."""
        # Mock the agent response
        mock_result = MagicMock()
        mock_result.output = ResumeMatchResult(
            match_score=85,
            resume_html="<h1>Resume</h1><p>This is a long enough resume content...</p>",
            cover_letter_html="<p>Cover letter content that is also long enough...</p>",
            company_name="Test Company",
            job_title="Software Engineer",
            key_improvements=["Added Python skills", "Emphasized leadership"],
            extracted_job_description=(
                "This is a sufficiently long and cleaned job description content that should pass "
                "the validation checks in the main handler."
            ),
        )

        with patch("main.resume_agent.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            response = client.post(
                "/api/analyze", json={"url": "https://example.com/job", "resume_id": sample_resume.id}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["score"] == 85
            assert "job_id" in data
            assert "company" in data

    def test_analyze_job_resume_not_found(self, client):
        """Test analysis with non-existent resume."""
        response = client.post("/api/analyze", json={"url": "https://example.com/job", "resume_id": 9999})

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_analyze_job_agent_failure(self, client, sample_resume):
        """Test handling of agent failures."""
        with patch("main.resume_agent.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.side_effect = Exception("Agent error")

            response = client.post(
                "/api/analyze", json={"url": "https://example.com/job", "resume_id": sample_resume.id}
            )

            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()

    def test_analyze_job_invalid_jd_extracted(self, client, sample_resume):
        """Test handling when agent fails to extract a proper JD."""
        mock_result = MagicMock()
        mock_result.output = ResumeMatchResult(
            match_score=50,
            resume_html="<h1>...</h1>",
            cover_letter_html="<p>...</p>",
            company_name="Unknown",
            job_title="Unknown",
            key_improvements=[],
            extracted_job_description="Error: Could not read page",  # This marks it as invalid
        )

        with patch("main.resume_agent.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            response = client.post(
                "/api/analyze", json={"url": "https://example.com/bad", "resume_id": sample_resume.id}
            )

            assert response.status_code == 400
            assert "valid job description" in response.json()["detail"].lower()

    def test_analyze_job_fast_mode_success(self, client, sample_resume):
        """Test JD-only extraction (Fast Mode) without resume matching."""
        # Mock the extraction agent response
        mock_result = MagicMock()
        mock_result.output = JDExtractionResult(
            match_score=None,
            company_name="Fast Co",
            job_title="Turbo Dev",
            extracted_job_description=(
                "This is a nicely formatted job description for the Fast Mode extraction test. "
                "It should be long enough to pass validation and stored without a score."
            ),
        )

        with patch("main.extraction_agent.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            response = client.post(
                "/api/analyze",
                json={"url": "https://example.com/fast-job", "resume_id": sample_resume.id, "generate_cv": False},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["score"] is None
            assert data["company"] == "Fast Co"
            assert "job_id" in data

    def test_analyze_job_jd_only_triggers_extraction_agent(self, client, sample_resume):
        """Verify that Fast Mode (generate_cv=False) ONLY uses extraction_agent."""
        mock_extract = MagicMock()
        mock_extract.output = JDExtractionResult(
            match_score=None, company_name="C1", job_title="T1", extracted_job_description="JD"
        )

        # Patch both agents to see which one is called
        with (
            patch("main.extraction_agent.run", new_callable=AsyncMock) as mock_extract_run,
            patch("main.resume_agent.run", new_callable=AsyncMock) as mock_resume_run,
        ):
            mock_extract_run.return_value = mock_extract

            client.post(
                "/api/analyze", json={"url": "http://j.ai", "resume_id": sample_resume.id, "generate_cv": False}
            )

            assert mock_extract_run.called
            assert not mock_resume_run.called

    def test_analyze_job_full_analysis_triggers_resume_agent(self, client, sample_resume):
        """Verify that Full Mode (generate_cv=True) ONLY uses resume_agent."""
        mock_resume = MagicMock()
        mock_resume.output = ResumeMatchResult(
            match_score=90,
            resume_html="R",
            cover_letter_html="C",
            company_name="C1",
            job_title="T1",
            key_improvements=[],
            extracted_job_description="JD",
        )

        with (
            patch("main.extraction_agent.run", new_callable=AsyncMock) as mock_extract_run,
            patch("main.resume_agent.run", new_callable=AsyncMock) as mock_resume_run,
        ):
            mock_resume_run.return_value = mock_resume

            client.post("/api/analyze", json={"url": "http://j.ai", "resume_id": sample_resume.id, "generate_cv": True})

            assert mock_resume_run.called
            assert not mock_extract_run.called


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
        """Test successful PDF generation for resume."""
        with patch("main.HTML") as mock_html:
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.write_pdf.return_value = b"PDF content"
            mock_html.return_value = mock_pdf_instance

            response = client.get(f"/api/jobs/{sample_job.id}/pdf")

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert "attachment" in response.headers["content-disposition"]
            assert "resume" in response.headers["content-disposition"]

    def test_generate_pdf_cover_letter_success(self, client, sample_job):
        """Test successful PDF generation for cover letter."""
        with patch("main.HTML") as mock_html:
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.write_pdf.return_value = b"PDF content"
            mock_html.return_value = mock_pdf_instance

            # Updated query param syntax for client.get
            response = client.get(f"/api/jobs/{sample_job.id}/pdf", params={"pdf_type": "cover"})

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert "attachment" in response.headers["content-disposition"]
            assert "cover" in response.headers["content-disposition"]

    def test_generate_pdf_job_not_found(self, client):
        """Test PDF generation for non-existent job."""
        response = client.get("/api/jobs/9999/pdf")

        assert response.status_code == 404

    def test_generate_pdf_no_content(self, client, db_session, sample_resume):
        """Test PDF generation when no content exists."""
        # Create a job with empty resume
        job = Job(
            resume_id=sample_resume.id,
            url="https://example.com/job",
            company="Test Company",
            title="Engineer",
            job_description="JD",
            resume="",  # Empty content
            cover_letter="",
            match_score=90,
            status=JobStatus.todo,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.get(f"/api/jobs/{job.id}/pdf")

        assert response.status_code == 400
        assert "content available" in response.json()["detail"]


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


class TestRegenerateJob:
    """Test job content regeneration endpoint."""

    @pytest.mark.asyncio
    async def test_regenerate_job_success(self, client, sample_job, sample_resume):
        """Test successful job content regeneration."""
        # Mock the agent response
        mock_result = MagicMock()
        mock_result.output = ResumeMatchResult(
            match_score=95,
            resume_html="<h1>Updated Resume</h1>",
            cover_letter_html="<p>Updated Cover letter</p>",
            company_name="Test Company",
            job_title="Software Engineer",
            key_improvements=["Even more Python", "AWS certification added"],
            extracted_job_description="Updated JD content",
        )

        with patch("main.resume_agent_no_tools.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            payload = {"prompt": "tech skill should have postgres instead of mysql"}
            response = client.post(f"/api/jobs/{sample_job.id}/regenerate", json=payload)

            assert response.status_code == 200
            data = response.json()
            # In our current regeneration logic, we focus on the cover letter
            # The resume stays as its original (un-tailored) self from the job record
            assert data["cover_letter"] == "<p>Updated Cover letter</p>"
            assert data["match_score"] == 95
            assert data["resume"] == sample_job.resume

    @pytest.mark.asyncio
    async def test_regenerate_job_no_prompt(self, client, sample_job):
        """Test regeneration without a prompt (uses default)."""
        mock_result = MagicMock()
        mock_result.output = ResumeMatchResult(
            match_score=90,
            resume_html="<h1>Regenerated</h1>",
            cover_letter_html="<p>Regenerated</p>",
            company_name="Test Company",
            job_title="Software Engineer",
            extracted_job_description="Regenerated JD",
        )

        with patch("main.resume_agent_no_tools.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            # Send empty JSON or no prompt
            response = client.post(f"/api/jobs/{sample_job.id}/regenerate", json={})

            assert response.status_code == 200
            # Should have called agent even without prompt
            assert mock_agent.called

    def test_regenerate_job_not_found(self, client):
        """Test regeneration for non-existent job."""
        response = client.post("/api/jobs/9999/regenerate", json={"prompt": "test"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_regenerate_job_agent_error(self, client, sample_job):
        """Test regeneration failure handling."""
        with patch("main.resume_agent_no_tools.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.side_effect = Exception("Regeneration failed")

            response = client.post(f"/api/jobs/{sample_job.id}/regenerate", json={"prompt": "fail me"})

            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_regenerate_job_missing_data(self, client, sample_job):
        """Test regeneration when agent returns incomplete data."""
        mock_result = MagicMock()

        # Use a simple object for data that has no attributes,
        # so getattr(data, 'match_score', default) returns the default.
        class EmptyData:
            pass

        mock_result.output = EmptyData()

        with patch("main.resume_agent_no_tools.run", new_callable=AsyncMock) as mock_agent:
            mock_agent.return_value = mock_result

            response = client.post(f"/api/jobs/{sample_job.id}/regenerate", json={"prompt": "break stuff"})

            # Since we couldn't find ANY data attributes in mock_result,
            # our fallback returns the result object itself, but it has no resume_html etc.
            # So the conditional updates in main.py won't happen, and it will return the ORIGINAL values.
            # BUT if extract_agent_data returns something that fails 'if data:', it returns 500.
            # In our implementation: 'if data:' on MagicMock is True.
            # Then getattr(data, 'resume_html', None) returns None for MagicMock.
            # The code should actually return a 200 with original values in this specific mock case,
            # or we can test the error path more strictly.

            assert response.status_code == 200
            # Returns original sample_job values since new ones are None


class TestUpdateJob:
    """Test job update endpoint."""

    def test_update_job_status(self, client, sample_job):
        """Test updating job status directly."""
        payload = {"status": "interview"}
        response = client.patch(f"/api/jobs/{sample_job.id}", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "interview"

    def test_toggle_applied_true(self, client, sample_job):
        """Test setting applied to true."""
        # Ensure it starts as todo (via fixture)
        assert sample_job.status == JobStatus.todo

        payload = {"applied": True}
        response = client.patch(f"/api/jobs/{sample_job.id}", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == JobStatus.applied

    def test_toggle_applied_false_reverts_to_todo(self, client, db_session, sample_resume):
        """Test that unticking applied reverts status to todo."""
        # Create a job that is already applied
        job = Job(
            resume_id=sample_resume.id,
            url="https://example.com/job",
            company="Test Company",
            title="Engineer",
            job_description="JD",
            resume="HTML",
            cover_letter="HTML",
            match_score=90,
            status=JobStatus.applied,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        payload = {"applied": False}
        response = client.patch(f"/api/jobs/{job.id}", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == JobStatus.todo

    def test_update_job_not_found(self, client):
        """Test updating a non-existent job."""
        response = client.patch("/api/jobs/9999", json={"status": "applied"})
        assert response.status_code == 404


class TestResumePDF:
    """Test resume PDF generation endpoint."""

    def test_generate_resume_pdf_success(self, client, sample_resume):
        """Test successful PDF generation for a resume."""
        with patch("main.HTML") as mock_html:
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.write_pdf.return_value = b"PDF content"
            mock_html.return_value = mock_pdf_instance

            response = client.get(f"/api/resumes/{sample_resume.id}/pdf")

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert "attachment" in response.headers["content-disposition"]
            # The filename in header is safe-formatted, so we check if a part of it exists
            # sample_resume.name is "Test Resume" -> safe is "Test_Resume.pdf"
            assert "Test" in response.headers["content-disposition"]

    def test_generate_resume_pdf_not_found(self, client):
        """Test PDF generation for non-existent resume."""
        response = client.get("/api/resumes/9999/pdf")
        assert response.status_code == 404


class TestDOCXGeneration:
    """Test DOCX generation endpoints for both resumes and jobs."""

    def test_generate_resume_docx_success(self, client, sample_resume):
        """Test successful DOCX generation for a resume."""
        # Mock Document and its save method to avoid external dependencies
        with patch("main.Document") as mock_doc:
            mock_instance = MagicMock()
            mock_doc.return_value = mock_instance

            response = client.get(f"/api/resumes/{sample_resume.id}/docx")

            assert response.status_code == 200
            assert (
                response.headers["content-type"]
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            assert "attachment" in response.headers["content-disposition"]
            assert "Test_Resume.docx" in response.headers["content-disposition"]

    def test_generate_resume_docx_not_found(self, client):
        """Test DOCX generation for non-existent resume."""
        response = client.get("/api/resumes/9999/docx")
        assert response.status_code == 404

    def test_generate_job_docx_success(self, client, sample_job):
        """Test successful DOCX generation for a job resume."""
        with patch("main.Document") as mock_doc:
            mock_instance = MagicMock()
            mock_doc.return_value = mock_instance

            response = client.get(f"/api/jobs/{sample_job.id}/docx")

            assert response.status_code == 200
            assert (
                response.headers["content-type"]
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            assert "attachment" in response.headers["content-disposition"]
            # raw_filename = f"{job.company}_{job.title}_{type}.docx"
            # Test_Company_Software_Engineer_resume.docx
            assert "Test_Company" in response.headers["content-disposition"]
            assert "resume.docx" in response.headers["content-disposition"]

    def test_generate_job_docx_cover_letter_success(self, client, sample_job):
        """Test successful DOCX generation for a job cover letter."""
        with patch("main.Document") as mock_doc:
            mock_instance = MagicMock()
            mock_doc.return_value = mock_instance

            response = client.get(f"/api/jobs/{sample_job.id}/docx", params={"type": "cover"})

            assert response.status_code == 200
            assert (
                response.headers["content-type"]
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            assert "cover.docx" in response.headers["content-disposition"]

    def test_generate_job_docx_not_found(self, client):
        """Test DOCX generation for non-existent job."""
        response = client.get("/api/jobs/9999/docx")
        assert response.status_code == 404

    def test_generate_job_docx_no_content(self, client, db_session, sample_resume):
        """Test DOCX generation when no content exists."""
        job = Job(
            resume_id=sample_resume.id,
            url="https://example.com/job",
            company="Empty Co",
            title="Ghost",
            job_description="JD",
            resume="",  # Empty
            cover_letter=None,
            match_score=0,
            status=JobStatus.todo,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.get(f"/api/jobs/{job.id}/docx")
        assert response.status_code == 400
        assert "content available" in response.json()["detail"]
