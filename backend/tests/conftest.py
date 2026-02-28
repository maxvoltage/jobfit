"""
Improved test configuration using pytest fixtures for better test isolation.

This follows SQLAlchemy 2.0 and FastAPI best practices:
1. Uses pytest fixtures for dependency injection
2. Provides better test isolation with transaction rollback
3. Cleaner separation of concerns
4. More maintainable and reusable
"""

import subprocess
import sys
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Mock WeasyPrint before importing main
mock_weasy = Mock()
mock_html = Mock()
mock_html.write_pdf.return_value = b"%PDF-mock-content"
mock_weasy.HTML.return_value = mock_html
sys.modules["weasyprint"] = mock_weasy

from database import Base, get_db  # noqa: E402
from main import app  # noqa: E402

# Use in-memory SQLite for faster tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine with special settings for SQLite
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # Keep connection alive for in-memory DB
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables once for the entire test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def pytest_sessionstart(session):
    """Automatically run ruff check and format check before starting tests."""
    from pathlib import Path

    # Try to find ruff in the same directory as the python executable
    python_path = Path(sys.executable)
    ruff_bin = "ruff"  # Default to path

    # If we are in a virtual environment, look in the bin/Scripts folder
    if (python_path.parent / "ruff").exists():
        ruff_bin = str(python_path.parent / "ruff")
    elif (python_path.parent / "ruff.exe").exists():
        ruff_bin = str(python_path.parent / "ruff.exe")

    print(f"\n--- Running Ruff Linter & Formatter ({ruff_bin}) ---")

    # 1. Check Linting
    try:
        lint_result = subprocess.run([ruff_bin, "check", ".", "--ignore", "E501"], capture_output=True, text=True)
        if lint_result.returncode != 0:
            print(lint_result.stdout)
            print(lint_result.stderr)
            pytest.exit("Linting failed. Please fix ruff errors before running tests.", returncode=1)

        # 2. Check Formatting
        format_result = subprocess.run([ruff_bin, "format", "--check", "."], capture_output=True, text=True)
        if format_result.returncode != 0:
            print(format_result.stdout)
            print(format_result.stderr)
            pytest.exit("Formatting failed. Please run 'ruff format .' before running tests.", returncode=1)

        print("Ruff: All checks passed!\n")
    except FileNotFoundError:
        print(f"Warning: '{ruff_bin}' not found. Skipping linting checks.")


@pytest.fixture(scope="function")
def db_session():
    """
    Provide a transactional scope for each test.

    This fixture creates a new database session for each test and automatically
    rolls back all changes after the test completes, ensuring test isolation.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session):
    """
    Provide a TestClient with overridden database dependency.

    This ensures all API calls during tests use the test database session.
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Session cleanup handled by db_session fixture

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# Optional: Fixture for creating test data
@pytest.fixture
def sample_resume(db_session: Session):
    """Create a sample resume for testing."""
    from models import Resume

    resume = Resume(
        name="Test Resume", content="# John Doe\nSoftware Engineer with 5 years experience", is_selected=False
    )
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)
    return resume


@pytest.fixture
def sample_job(db_session: Session, sample_resume):
    """Create a sample job for testing."""
    from models import Job, JobStatus

    job = Job(
        resume_id=sample_resume.id,
        url="https://example.com/job",
        company="Test Company",
        title="Software Engineer",
        original_jd="Job description here",
        resume="<h1>Resume</h1>",
        cover_letter="<p>Cover Letter Content</p>",
        match_score=85,
        status=JobStatus.todo,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job
