from markitdown import MarkItDown
import io
import httpx
from typing import Optional

# Initialize MarkItDown once
md_converter = MarkItDown()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file and converts it to Markdown.
    
    Using Microsoft's MarkItDown ensures that headers, lists, and tables 
    in the resume are preserved in a format that LLMs understand well.
    """
    try:
        # result = md_converter.convert_stream(io.BytesIO(file_bytes), file_extension=".pdf")
        # Note: In some versions of markitdown, convert_stream is the preferred way for bytes.
        result = md_converter.convert_stream(io.BytesIO(file_bytes), file_extension=".pdf")
        return result.markdown
    except Exception as e:
        return f"Error: Failed to extract text from PDF. Details: {str(e)}"

async def scrape_job_description(url: str) -> str:
    """
    Scrapes a job description from a URL using Jina Reader (r.jina.ai).
    
    This tool allows the agent to fetch the full text of any job posting 
    to analyze it against the user's resume.
    """
    if not url.startswith(('http://', 'https://')):
        return "Error: Invalid URL. Please provide a full URL starting with http:// or https://"

    jina_url = f"https://r.jina.ai/{url}"
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(jina_url)
            response.raise_for_status()
            
            content = response.text.strip()
            if not content:
                return "Error: The job description page was empty or could not be read."
            
            return content
            
    except httpx.HTTPStatusError as e:
        return f"Error: Failed to fetch the job description. (HTTP {e.response.status_code})"
    except httpx.ConnectError:
        return "Error: Could not connect to the scraper service. Please check your internet connection."
    except Exception as e:
        return f"Error: An unexpected error occurred while scraping: {str(e)}"
