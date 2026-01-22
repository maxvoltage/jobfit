from fastapi import FastAPI
from database import engine, Base
import models  # Ensure models are registered to Base
import config  # Load environment variables

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JobFit API",
    description="AI-powered resume tailoring service",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to JobFit API",
        "llm_model": config.LLM_NAME
    }
