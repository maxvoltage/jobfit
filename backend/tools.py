from markitdown import MarkItDown
import io
import httpx
from typing import Optional
import pypdf

# Initialize MarkItDown once
md_converter = MarkItDown()

import tempfile
import os

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file and converts it to Markdown.
    
    Using Microsoft's MarkItDown ensures that headers, lists, and tables 
    in the resume are preserved in a format that LLMs understand well.
    """
    try:
        print(f"DEBUG: Starting PDF text extraction for {len(file_bytes)} bytes...")
        
        # Write bytes to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_bytes)
            temp_path = temp_pdf.name
        
        try:
            # Multi-stage extraction: first try MarkItDown.convert() on the file
            result = md_converter.convert(temp_path)
            content = result.markdown.strip()
            
            # If empty, try pypdf as a fallback
            if not content:
                print("DEBUG: MarkItDown empty, trying pypdf...")
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text_parts = []
                for page in reader.pages:
                    text_parts.append(page.extract_text())
                content = "\n".join(text_parts).strip()
                
            if not content:
                print("ERROR: All extraction methods returned empty content.")
                return "Error: Could not extract any text from the PDF. The file might be scanned or empty."
            
            print(f"DEBUG: PDF extraction complete. Extracted {len(content)} characters.")
            return content
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        print(f"ERROR: PDF extraction failed: {str(e)}")
        import traceback
        print(traceback.format_exc())
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
        print(f"DEBUG: Scraping job description from URL: {url} using Jina...")
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(jina_url)
            response.raise_for_status()
            
            content = response.text.strip()
            if not content:
                print("ERROR: Scraped job description was empty.")
                return "Error: The job description page was empty or could not be read."
            
            print(f"DEBUG: Successfully scraped {len(content)} characters from the job description.")
            return content
            
    except httpx.HTTPStatusError as e:
        print(f"ERROR: Jina scraper failed with HTTP {e.response.status_code}")
        return f"Error: Failed to fetch the job description. (HTTP {e.response.status_code})"
    except httpx.ConnectError:
        print("ERROR: Could not connect to Jina scraper service.")
        return "Error: Could not connect to the scraper service. Please check your internet connection."
    except Exception as e:
        print(f"ERROR: Unexpected scraping error: {str(e)}")
        return f"Error: An unexpected error occurred while scraping: {str(e)}"
