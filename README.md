# JobFit

JobFit is a tool that helps you tailor your resume and cover letter for specific job postings using AI.

## Architecture

JobFit is a full-stack web application with a React frontend and FastAPI backend, designed for single-user local deployment.

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                    (React + TypeScript)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   REST API   │  │  AI Agents   │  │   PDF Generation     │   │
│  │  Endpoints   │  │ (PydanticAI) │  │   (WeasyPrint)       │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                  │                     │              │
│         └──────────────────┴─────────────────────┘              │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────-┐                          │
│                   │  SQLite Database │                          │
│                   │  (Resumes, Jobs) │                          │
│                   └─────────────────-┘                          │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  External Services   │
              │  - Jina AI (Scraper) │
              │  - LLM API (Mistral) │
              └──────────────────────┘
```

### Tech Stack

#### Frontend (`/frontend`)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React hooks (useState, useEffect)
- **Rich Text Editing**: Tiptap (for resume/cover letter editing)
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint

#### Backend (`/backend`)
- **Framework**: FastAPI (Python 3.13)
- **Package Manager**: uv
- **Database**: SQLAlchemy 2.0 with SQLite
- **AI Framework**: PydanticAI with Mistral AI
- **PDF Processing**: 
  - MarkItDown (PDF text extraction)
  - WeasyPrint (PDF generation)
- **Web Scraping**: httpx + Jina AI Reader
- **Testing**: pytest + pytest-asyncio
- **Linting**: Ruff

### Data Flow

1. **Resume Upload**
   ```
   User link their resume/porfolio that is not behind any authentication → Backend scrapes with Jina AI
   or uploads PDF → Backend extracts text 
   or pastes resume text → Backend cleans text using LLM
   → Stores in SQLite → Return to the dashboard
   ```

2. **Job Analysis**
   ```
   User submits job URL → Backend scrapes with Jina AI
   or pastes job description
   → AI agent analyzes + tailors resume → Saves to database → Returns results

   User clicks "Edit Text" → Tiptap editor loads HTML body → 
   User makes changes → Frontend re-wraps with original styles → 
   Backend saves updated content
   or clicks "Regenerate" → Backend regenerates content with custom instructions → 
   Returns updated content
   ```

4. **PDF Download**
   ```
   Returns PDF file separately, the resume and the cover letter
   ```

### Key Components

#### AI Agents (PydanticAI)
- **Resume Agent**: Analyzes job descriptions and tailors resumes
- **Clean Resume Agent**: Formats pasted resume text into Markdown
- **Tools**: 
  - `scrape_job_description`: Fetches job postings via Jina AI
  - `extract_text_from_pdf`: Converts PDF bytes to text

#### Database Schema
- **Resume Table**: Stores user resumes (PDF text, metadata)
- **Job Table**: Stores job applications (company, title, tailored content, match score)

#### API Endpoints
- `POST /api/resumes/upload`: Upload PDF resume
- `POST /api/resumes/import-url`: Import resume from URL
- `POST /api/resumes/manual`: Save pasted resume text
- `POST /api/analyze`: Analyze job and tailor resume
- `PATCH /api/jobs/{id}`: Update job content (for editing)
- `GET /api/jobs/{id}/pdf`: Download tailored resume/cover letter as PDF
- `POST /api/jobs/{id}/regenerate`: Regenerate content with custom instructions

### Project Structure

```
jobfit/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # API client, utilities
│   │   └── test/          # Frontend tests
│   └── package.json
├── backend/               # FastAPI server
│   ├── agent.py           # AI agent definitions
│   ├── tools.py           # Agent tools (scraping, PDF extraction)
│   ├── main.py            # API endpoints
│   ├── models.py          # Database models
│   ├── prompts.py         # AI system prompts
│   └── tests/             # Backend tests
├── Dockerfile             # Production container
├── docker-compose.yml     # Local development setup
├── render.yaml            # Render deployment setup
└── jobfit.db              # SQLite database (local)
```


## Running with Docker (Unified)

To run both the frontend and backend in a single container:

1. **Build the image**:
   ```bash
   docker build -t jobfit .
   ```
2. **Run the container**:
   ```bash
   docker run -p 8000:8000 jobfit
   ```
3. Open your browser to `http://localhost:8000`.

**OR use Docker Compose (Recommended for local dev):**
```bash
docker-compose up --build
```
This handles your `.env` file and ensures your data is saved in a local `./data` folder.

### **Important Notes:**
- **Data Persistence**: The SQLite database is stored in `./data/jobfit.db` on your machine. This ensures your resumes and applications aren't lost if you delete the container.
- **Optimization**: The final Docker image is optimized for production. It **excludes** all development tools (like Ruff, ESLint, Vitest) and only contains the necessary runtime libraries and built frontend assets.
- **Unified Serving**: The FastAPI backend acts as the web server for both the API and the React frontend. You do not need to run a separate frontend server when using Docker.

## Deployment & CI/CD

- **Deployment**: The `Dockerfile` allows for a single-container deployment on platforms like Render. It build the frontend and serves it through the FastAPI backend.
- **CI/CD**: The project uses **GitHub Actions** for automated testing and linting. Note that while Docker handles the execution environment, the CI pipeline ensures code quality before deployment. This part is independent of your local Docker builds.

Detailed setup instructions and validation rules are located in the `/backend` and `/frontend` directories.

## Possible Future Improvements

- Multi user support: Currently, the application is designed for a single user. Future improvements could include user authentication and authorization to allow multiple users to access only their own resumes and applications.
- Scrape job sites and suggest jobs for the users using match percentage
- Stable match percentage via granular scoring sheet
