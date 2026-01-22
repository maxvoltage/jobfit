from fastapi import FastAPI
from database import engine, Base
import models # Ensure models are registered to Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobFit API")

@app.get("/")
async def root():
    return {"message": "Welcome to JobFit API"}
