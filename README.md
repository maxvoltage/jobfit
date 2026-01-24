# JobFit

JobFit is a tool that helps you tailor your resume and cover letter for specific job postings using AI.

## Architecture

The project is split into two main parts:

### Frontend (React)
- Handles the user interface and file uploads.
- Built with React, TypeScript, and Tailwind CSS.
- Communicates with the backend via a REST API.

### Backend (FastAPI)
- Handles PDF text extraction and web scraping.
- Uses AI agents (PydanticAI) to analyze jobs and rewrite content.
- Manages a SQLite database to store your resumes and application history.
- Generates professional PDFs using WeasyPrint.

## Project Structure

- `/frontend`: The React application.
- `/backend`: The FastAPI server and AI logic.
- `jobfit.db`: The local database file.

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

- Multi user support: Currently, the application is designed for a single user. Future improvements could include user authentication and authorization to allow multiple users to access their own resumes and applications.
- Uploaded resume history: Currently, the application only stores the most recent resume and application. Future improvements could include a history of uploaded resumes and applications to allow users to access previous versions.