# Course Project Overview: JobFit

This document evaluates the JobFit project against the course scoring criteria.

## Scoring Summary

| Category | Score | Status |
| :--- | :---: | :--- |
| Problem description | 2/2 | Documented in root README |
| AI system development | 2/2 | AI tooling and MCP usage documented |
| Technologies & Architecture | 2/2 | Detailed in AGENTS.md |
| Front-end implementation | 3/3 | Functional, structured, and tested |
| API contract | 2/2 | OpenAPI specification provided |
| Back-end implementation | 3/3 | Modular, contract-compliant, and tested |
| Database integration | 2/2 | Supports SQLite and Postgres via SQLAlchemy |
| Containerization | 2/2 | Single-container multi-stage Docker build |
| Integration testing | 2/2 | Separated and documented tests |
| Deployment | 2/2 | Configured for Render cloud deployment |
| CI/CD pipeline | 2/2 | GitHub Actions implemented |
| Reproducibility | 2/2 | Clear end-to-end setup instructions |

---

## Detailed Evaluation

### 1. Problem description (README)
*   **Ranking:** 2 points
*   **Explanation:** The project includes a root `README.md` that clearly describes the problem context (inefficient manual resume tailoring) and defines the system's functionality (automated scraping, AI analysis, and PDF export).

### 2. AI system development (tools, workflow, MCP)
*   **Ranking:** 2 points
*   **Explanation:** Development leveraged AI assistants for code generation and architectural guidance, captured in `AGENTS.md`. The system uses PydanticAI for core logic and specifically documents how MCP tools (e.g., Context7) were used for library documentation and tool implementation.

### 3. Technologies and system architecture
*   **Ranking:** 2 points
*   **Explanation:** The main technologies (FastAPI, React, SQLite, WeasyPrint) are clearly defined. The root `README.md` and `AGENTS.md` explain their roles and how they integrate into the overall system architecture.

### 4. Front-end implementation
*   **Ranking:** 3 points
*   **Explanation:** The React frontend is modular and uses centralized API communication. Core features and components are covered by unit and integration tests located in `frontend/src/test/`. Execution instructions are provided in `frontend/README.md`.

### 5. API contract (OpenAPI specifications)
*   **Ranking:** 2 points
*   **Explanation:** An `openapi.yaml` file exists in the root directory, documenting all endpoints and schemas. It serves as the single source of truth for both frontend and backend development.

### 6. Back-end implementation
*   **Ranking:** 3 points
*   **Explanation:** The backend is built with FastAPI, strictly adhering to the OpenAPI specification. It includes a robust test suite in `backend/tests/` that verifies API logic, extraction tools, and edge-case handling.

### 7. Database integration
*   **Ranking:** 2 points
*   **Explanation:** The project uses SQLAlchemy/SQLModel for the database layer. It defaults to SQLite for local use but is fully compatible with PostgreSQL by changing the `DATABASE_URL` and adding the required driver, as documented in `backend/POSTGRES_GUIDE.md`.

### 8. Containerization
*   **Ranking:** 2 points
*   **Explanation:** A multi-stage `Dockerfile` in the root builds the React frontend and packages it into the FastAPI backend image. The entire system can be run with a single `docker run` command or via the provided `docker-compose.yml`, satisfying the criteria for clear orchestration.

### 9. Integration testing
*   **Ranking:** 2 points
*   **Explanation:** Integration tests are explicitly separated from unit tests and marked using Pytest. They cover end-to-end workflows including database persistence and tool interactions.

### 10. Deployment
*   **Ranking:** 2 points
*   **Explanation:** The project is configured for cloud deployment using Render, evidenced by the `render.yaml` configuration file and optimized production build steps.

### 11. CI/CD pipeline
*   **Ranking:** 2 points
*   **Explanation:** A CI/CD pipeline is implemented via GitHub Actions (`.github/workflows/ci.yml`). It automatically executes linting and testing suites on every push to maintain code quality.

### 12. Reproducibility
*   **Ranking:** 2 points
*   **Explanation:** Clear, step-by-step instructions are provided in the root `README.md` and component-specific READMEs to set up, run, and test the system from a fresh clone.