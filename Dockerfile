# Stage 1: Build the frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
# Only copy package files first for caching
COPY frontend/package*.json ./
RUN npm install
# Copy rest of the frontend and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and combine
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Default environment variables
# Ensures the database persists in the mapped volume
ENV DATABASE_URL=sqlite:////app/data/jobfit.db

# Install uv for faster Python dependency management
RUN pip install --no-cache-dir uv

# Copy backend dependency files
COPY backend/pyproject.toml backend/uv.lock ./

# Install Python dependencies (EXCLUDING dev dependencies like ruff/pytest)
RUN uv sync --frozen --no-dev

# Copy backend application code
COPY backend/ ./

# Copy built frontend from Stage 1 (NO node_modules or source code copied)
COPY --from=frontend-build /app/frontend/dist ./static

# Create directory for SQLite database persistence
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run the application (using --no-dev to ensure it doesn't try to install ruff/pytest)
CMD ["uv", "run", "--no-dev", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
