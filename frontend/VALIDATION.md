# Frontend Validation

This document describes the client-side validation logic to ensure data integrity and a smooth user experience.

## 1. Resume Upload
*   **Case: File Type Check**
    *   **Logic:** The file picker is restricted to `.pdf`. An additional check ensures the selected file MIME type is `application/pdf`.
    *   **Error Message:** `"Please select a valid PDF file."` (Toast)

*   **Case: File Size Limit**
    *   **Logic:** Prevents uploading files larger than 5MB to ensure fast processing and avoid server timeouts.
    *   **Error Message:** `"File size must be less than 5MB."` (Toast)

## 2. Job Analysis Form
*   **Case: URL vs. Manual Description**
    *   **Logic:** Validates that either a valid URL is provided OR a job description text is entered. Both cannot be empty.
    *   **Error Message:** `"Please provide either a job URL or a job description."` (Toast)

*   **Case: URL Format**
    *   **Logic:** Basic regex check to ensure the input looks like a valid URL (starts with http/https).
    *   **Error Message:** `"Please enter a valid URL."` (Inline feedback)

*   **Case: Minimum Description Length**
    *   **Logic:** If manual entry is used, the text must be at least 100 characters long to provide enough context for the AI.
    *   **Error Message:** `"Job description is too short. Please provide more details (min 100 characters)."` (Inline feedback)

## 3. Application State
*   **Case: Resume Selection**
    *   **Logic:** Ensures a resume is selected or available before allowing a job analysis to start.
    *   **Error Message:** `"No resume found. Please upload a resume first."` (Redirect/Toast)

## 4. Job Detail Editing
*   **Case: Edit Mode Validation**
    *   **Logic:** Users can edit the resume and cover letter content using a rich-text editor (Tiptap). The editor extracts the `<body>` content from the HTML for editing and re-wraps it with the original HTML structure (including CSS) when saving.
    *   **Error Message:** `"Failed to save changes"` (Toast on API error)

*   **Case: Content Preservation**
    *   **Logic:** When entering edit mode, the original HTML structure is preserved. Only the body content is editable. Upon saving, the edited content is wrapped back into the original HTML with all styling intact.
    *   **Error Message:** N/A (Automatic handling)

*   **Case: Cancel Edit**
    *   **Logic:** Users can cancel editing without saving changes. No API call is made when canceling.
    *   **Error Message:** N/A (No error state)
