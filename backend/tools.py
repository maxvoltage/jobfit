import os
import tempfile

import fitz  # PyMuPDF
import httpx
from markitdown import MarkItDown

from logger import log_ai_interaction, log_debug, log_error

# Initialize MarkItDown once
md_converter = MarkItDown()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file and converts it to Markdown.

    Tries multiple methods:
    1. MarkItDown (Best for structure/formatting)
    2. PyMuPDF (Best for raw text extraction from complex layouts)
    """
    try:
        log_debug(f"Starting PDF text extraction for {len(file_bytes)} bytes...")

        # Method 1: MarkItDown with temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_bytes)
            temp_path = temp_pdf.name

        content = ""
        try:
            result = md_converter.convert(temp_path)
            content = result.markdown.strip()
        except Exception as e:
            log_debug(f"MarkItDown failed: {e}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # Method 2: Fallback to PyMuPDF (fitz) if MarkItDown failed or returned too little content
        if not content or len(content) < 50:
            log_debug(f"MarkItDown result insufficient ({len(content)} chars), trying PyMuPDF (fitz)...")
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                text_parts = []
                for page in doc:
                    text_parts.append(page.get_text())
                fitz_content = "\n".join(text_parts).strip()
                doc.close()

                # Only use Fitz content if it's better than what we already have
                if len(fitz_content) > len(content):
                    content = fitz_content
            except Exception as e:
                log_debug(f"PyMuPDF extraction failed: {e}")

        # Final validation
        if not content or len(content.strip()) < 50:
            log_error(f"Extraction returned insufficient content ({len(content) if content else 0} chars).")
            return (
                "Error: Could not extract enough text from the PDF. "
                "This usually happens if the PDF is scanned (an image) or mostly graphics. "
                "Please try a text-based PDF or copy-paste your resume text manually."
            )

        log_debug(f"PDF extraction complete. Extracted {len(content)} characters.")
        return content

    except Exception as e:
        log_error(f"Unexpected PDF extraction failure: {str(e)}")
        import traceback

        print(traceback.format_exc())
        return f"Error: Failed to extract text from PDF. Details: {str(e)}"


async def scrape_job_description(url: str) -> str:
    """
    Scrapes a job description from a URL using Jina Reader (r.jina.ai).
    """
    if not url.startswith(("http://", "https://")):
        return "Error: Invalid URL. Please provide a full URL starting with http:// or https://"

    jina_url = f"https://r.jina.ai/{url}"
    try:
        log_debug(f"Scraping job description from URL: {url} using Jina...")
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(jina_url)
            response.raise_for_status()

            content = response.text.strip()
            if not content or len(content) < 100:
                log_error(f"Scraped content was too short or empty ({len(content) if content else 0} chars).")
                return "Error: The job description page was empty, too short, or could not be read correctly."

            log_ai_interaction("SCRAPED CONTENT (JINA)", content, "yellow")

            log_debug(f"Successfully scraped {len(content)} characters from the job description.")
            return content

    except httpx.HTTPStatusError as e:
        log_error(f"Jina scraper failed with HTTP {e.response.status_code}")
        return f"Error: Failed to fetch the job description. (HTTP {e.response.status_code})"
    except httpx.ConnectError:
        log_error("Could not connect to Jina scraper service.")
        return "Error: Could not connect to the scraper service. Please check your internet connection."
    except Exception as e:
        log_error(f"Unexpected scraping error: {str(e)}")
        return f"Error: An unexpected error occurred while scraping: {str(e)}"
