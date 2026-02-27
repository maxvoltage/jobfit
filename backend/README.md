# JobFit Backend

AI-powered resume matching service built with FastAPI, PydanticAI, and SQLAlchemy.

## Features

- 📄 **PDF Resume Upload**: Extract text from PDF resumes using MarkItDown
- 🤖 **AI-Powered Tailoring**: Use PydanticAI agents to tailor resumes to specific job descriptions
- 🔍 **Job Scraping**: Automatically fetch job descriptions from URLs using Jina Reader
- 📊 **Match Scoring**: Get AI-generated match scores (0-100) for each job
- 📥 **PDF Generation**: Export resumes as professional PDFs using WeasyPrint
- 💾 **SQLite Database**: Local-first data storage with SQLAlchemy

## Prerequisites

### System Dependencies

WeasyPrint requires system libraries for PDF generation. Install them based on your OS:

#### macOS (using Homebrew)
```bash
brew install pango gdk-pixbuf libffi
```

#### Ubuntu/Debian
```bash
sudo apt-get install -y \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    python3-cffi \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info
```

#### Windows
Download and install GTK3 from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases

For more details, see: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation

### Python

- Python 3.13+ (managed via `uv`)

## Installation

1. **Install system dependencies** (see above)

2. **Install Python dependencies**:
```bash
uv sync
```

3. **Set up environment variables**:
```bash
cp ../.env.example ../.env
```

Edit `.env` and add your API key for your chosen LLM provider:
```env
# Choose one:
OPENAI_API_KEY=your-key-here
# ANTHROPIC_API_KEY=your-key-here
# MISTRAL_API_KEY=your-key-here
# GOOGLE_API_KEY=your-key-here

LLM_NAME=openai:gpt-4o
```

  Find more about model API key env variable key and model name string in PydanticAI docs Models&Providers [page](https://ai.pydantic.dev/models/overview/). These env variables are used in PydanticAI.

## Running the Server

```bash
uv run uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

### Run all tests
```bash
uv run pytest
```

### Run specific test files
```bash
uv run pytest tests/test_tools.py -v
uv run pytest tests/test_api.py -v
```

### Run only unit tests (skip integration tests)
```bash
uv run pytest -m "not integration"
```

### Run with coverage
```bash
uv run pytest --cov=. --cov-report=html
```

## Project Structure

```
backend/
├── main.py              # FastAPI application and endpoints
├── agent.py             # PydanticAI agent configuration
├── tools.py             # Agent tools (PDF extraction, web scraping)
├── models.py            # SQLAlchemy database models
├── database.py          # Database configuration
├── config.py            # Environment configuration
├── pyproject.toml       # Dependencies and project metadata
└── tests/
    ├── test_api.py      # API endpoint tests
    └── test_tools.py    # Tool function tests
```

## Database Schema

### Resume Table
- `id`: Primary key
- `name`: Resume name (from filename)
- `content`: Extracted text content
- `is_selected`: Boolean flag for the currently selected resume used for matching.

### Job Table
- `id`: Primary key
- `resume_id`: Foreign key to Resume
- `url`: Job posting URL
- `company`: Company name
- `title`: Job title
- `original_jd`: Original job description
- `resume`: AI-resume HTML
- `match_score`: Match score (0-100)
- `status`: Application status (todo/applied/interview)
- `created_at`: Timestamp

## Database Storage

### Location
- **Standard**: The database is stored as `data/jobfit.db`.
- **Docker/Production**: The database is located at `/app/data/jobfit.db`.
- **Automatic Resolution**: The backend automatically resolves the relative path `sqlite:///data/jobfit.db` against the project root, making it compatible with both local terminal runs and Docker.

### Rationale
We store the database in a dedicated `/app/data` volume (or host-mapped folder) to ensure **data persistence**. Since Docker containers are ephemeral (files inside are lost when the container is deleted), mapping the SQLite file to your local machine ensures your resumes and application history are preserved across restarts and updates.

## Development

### Code Quality

Run linter:
```bash
uv run ruff check .
```

Auto-fix issues:
```bash
uv run ruff check --fix .
```

### Adding Dependencies

```bash
uv add package-name
```

For dev dependencies:
```bash
uv add --dev package-name
```

## Troubleshooting

### WeasyPrint Import Error

If you see `OSError: cannot load library 'libgobject-2.0-0'`, you need to install system dependencies:

**macOS:**
```bash
brew install pango gdk-pixbuf libffi
```

**Linux:**
```bash
sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
```

### Database Locked Error

If you get a "database is locked" error, make sure you're not running multiple instances of the server.

### LLM API Errors

Make sure your API key is correctly set in `.env` and you have sufficient credits/quota with your provider.

## License

MIT
