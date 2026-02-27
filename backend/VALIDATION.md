# Backend Content Validation & Error Handling

This document outlines the validation logic and error messages implemented in the JobFit backend to ensure high-quality data processing and helpful user feedback.

## 1. Resume Validation

### PDF Upload
*   **Case: Invalid File Type**
    *   **Logic:** Checks if the filename ends with `.pdf`.
    *   **Error Message:** `"Only PDF files are supported"`
    *   **Status Code:** `400 Bad Request`
    *   **Test coverage:** `test_upload_non_pdf_file`

*   **Case: Insufficient Content (< 50 characters)**
    *   **Logic:** After attempting extraction via MarkItDown and PyMuPDF, if the resulting string is less than **50 characters**, it is rejected. This prevents scanned images or graphics-heavy PDFs from being saved.
    *   **Error Message:** `"The extracted resume content is insufficient. Please ensure the PDF is not scanned or empty."`
    *   **Status Code:** `400 Bad Request`
    *   **Test coverage:** `test_upload_insufficient_content`, `test_rejects_insufficient_content`

### URL Import
*   **Case: Insufficient Scraped Content (< 50 characters)**
    *   **Logic:** Similar to upload, if a scraped profile (e.g., LinkedIn) results in less than **50 characters** of text, it is rejected.
    *   **Error Message:** `"The scraped resume content is insufficient."`
    *   **Status Code:** `400 Bad Request`
    *   **Test coverage:** Verified via `test_detects_short_response`

---

## 2. Job Description Validation

### Scraping (Jina Reader)
*   **Case: Invalid URL**
    *   **Logic:** URL must start with `http://` or `https://`.
    *   **Error Message:** `"Error: Invalid URL. Please provide a full URL starting with http:// or https://"`
    *   **Test coverage:** `test_rejects_invalid_url_format`

*   **Case: Short/Empty Page (< 100 characters)**
    *   **Logic:** If the Jina Reader returns content shorter than **100 characters**, it is considered a failed scrape (likely a login wall, cookie consent page, or error page).
    *   **Error Message:** `"Error: The job description page was empty, too short, or could not be read correctly."`
    *   **Test coverage:** `test_detects_short_response`, `test_detects_empty_response`

---

## 3. AI Agent & Analysis Validation

### Job Analysis (`/api/analyze`)
*   **Case: Invalid Job Description Extraction**
    *   **Logic:** During analysis, the AI agent is tasked with cleaning the scraped job description. If the AI output for `extracted_job_description` contains `"Error:"` or is less than **50 characters**, the process is aborted.
    *   **Error Message:** `"Could not extract a valid job description. The source might be empty, mostly graphics, or protected."`
    *   **Status Code:** `400 Bad Request`
    *   **Test coverage:** `test_analyze_job_invalid_jd_extracted`

---

## 4. System & PDF Generation

*   **Case: Missing Metadata for PDF**
    *   **Logic:** Checks if `resume` or `cover_letter` fields are empty before attempting to run WeasyPrint.
    *   **Error Message:** `"No {pdf_type} content available for PDF generation"`
    *   **Status Code:** `400 Bad Request`
    *   **Test coverage:** `test_generate_pdf_no_content`

*   **Case: Database Integrity**
    *   **Logic:** Ensures `Resume` or `Job` exists before processing.
    *   **Error Message:** `"Resume not found"` / `"Job not found"`
    *   **Status Code:** `404 Not Found`
    *   **Test coverage:** `test_analyze_job_resume_not_found`, `test_get_job_not_found`

---

## 5. Job Update \u0026 Content Editing

### PATCH `/api/jobs/{job_id}`
*   **Case: Update Tailored Resume/Cover Letter**
    *   **Logic:** Allows updating the `resume` and `cover_letter` fields after AI generation. This enables users to manually edit content before downloading PDFs. The endpoint accepts optional fields: `status`, `applied`, `resume`, and `cover_letter`.
    *   **Error Message:** `"Job not found"`
    *   **Status Code:** `404 Not Found` (if job doesn't exist)
    *   **Test coverage:** Existing `test_update_job_status` covers the endpoint

*   **Case: Content Validation**
    *   **Logic:** No minimum length validation is applied to edited content, as users may intentionally shorten or modify the AI-generated text. The content is saved as-is.
    *   **Error Message:** N/A (No validation errors for content length)

*   **Case: HTML Structure Preservation**
    *   **Logic:** The frontend is responsible for preserving the HTML structure (head, style tags, etc.) when editing. The backend simply stores the provided HTML string.
    *   **Error Message:** N/A (Backend doesn't validate HTML structure)
