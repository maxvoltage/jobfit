from pydantic import BaseModel, Field
from pydantic_ai import Agent

from config import LLM_NAME
from prompts import (
    CLEAN_RESUME_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
)
from tools import scrape_job_description


class ResumeMatchResult(BaseModel):
    """Structured output from the resume tailoring agent."""

    match_score: int = Field(
        ..., ge=0, le=100, description="Match score between 0-100 indicating how well the resume fits the job"
    )
    resume_html: str = Field(
        ..., description="The formatted resume content in clean HTML structure, preserve the original source wording"
    )
    cover_letter_html: str = Field(
        ..., description="A tailored cover letter in clean HTML format, ready for PDF conversion with WeasyPrint"
    )
    company_name: str = Field(..., description="The name of the company from the job description")
    job_title: str = Field(..., description="The job title from the job description")
    key_improvements: list[str] = Field(default_factory=list, description="List of key improvements made to the resume")
    extracted_job_description: str = Field(
        ...,
        description=(
            "The clean, extracted job description text (markdown) from the source (URL or text), "
            "removing navigation, headers, and footers."
        ),
    )


# Initialize the agent
resume_agent = Agent(
    LLM_NAME,  # Loaded from .env file
    output_type=ResumeMatchResult,
    system_prompt=RESUME_SYSTEM_PROMPT,
    tools=[scrape_job_description],
)

# Initialize a text-only agent for manual entry (avoids unnecessary scraping/tool errors)
resume_agent_no_tools = Agent(
    LLM_NAME,
    output_type=ResumeMatchResult,
    system_prompt=RESUME_SYSTEM_PROMPT,
    tools=[],
)


# Agent for cleaning messy pasted resume text into clean Markdown
clean_resume_agent = Agent(
    LLM_NAME,
    system_prompt=CLEAN_RESUME_SYSTEM_PROMPT,
)
