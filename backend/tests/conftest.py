"""
Improved test configuration using pytest fixtures for better test isolation.

This follows SQLAlchemy 2.0 and FastAPI best practices:
1. Uses pytest fixtures for dependency injection
2. Provides better test isolation with transaction rollback
3. Cleaner separation of concerns
4. More maintainable and reusable
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from unittest.mock import Mock
import sys

# Mock WeasyPrint before importing main
sys.modules['weasyprint'] = Mock()
sys.modules['weasyprint'].HTML = Mock

from main import app
from database import Base, get_db

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
        name="Test Resume",
        content="# John Doe\nSoftware Engineer with 5 years experience",
        is_master=False
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
        tailored_resume="<h1>Tailored Resume</h1>",
        match_score=85,
        status=JobStatus.todo
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job
