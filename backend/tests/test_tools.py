from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from tools import extract_text_from_pdf, scrape_job_description


class TestExtractTextFromPDF:
    """Unit tests for PDF text extraction logic."""

    def test_handles_extraction_exception(self):
        """Verify error handling when MarkItDown and fallback fail."""
        with patch("tools.md_converter.convert") as mock_convert:
            mock_convert.side_effect = ValueError("Unsupported PDF version")

            with patch("tools.fitz.open") as mock_fitz:
                mock_fitz.side_effect = Exception("Fitz failed")

                result = extract_text_from_pdf(b"fake pdf")

                # Test our error handling logic
                assert result.startswith("Error:")
                assert "extract" in result.lower() and "text" in result.lower()

    def test_returns_markdown_from_converter(self):
        """Verify we correctly extract the markdown attribute."""
        with patch("tools.md_converter.convert") as mock_convert:
            mock_result = MagicMock()
            mock_result.markdown = (
                "This is a sufficiently long resume content that should pass the length check easily."
            )
            mock_convert.return_value = mock_result

            result = extract_text_from_pdf(b"test")

            # Test we're accessing the right attribute
            assert "sufficiently long" in result
            assert not result.startswith("Error:")

    def test_fallback_to_fitz(self):
        """Verify fallback to PyMuPDF (fitz) when MarkItDown fails."""
        with patch("tools.md_converter.convert") as mock_convert:
            mock_convert.side_effect = Exception("MarkItDown failed")

            with patch("tools.fitz.open") as mock_fitz:
                mock_doc = MagicMock()
                mock_page = MagicMock()
                mock_page.get_text.return_value = (
                    "This is a sufficiently long resume content from Fitz that should pass."
                )
                mock_doc.__iter__.side_effect = lambda: iter([mock_page])
                mock_fitz.return_value = mock_doc

                result = extract_text_from_pdf(b"fake pdf")
                assert "from Fitz" in result
                assert mock_fitz.called

    def test_rejects_insufficient_content(self):
        """Verify that very short extraction results are treated as errors."""
        with patch("tools.md_converter.convert") as mock_convert:
            mock_result = MagicMock()
            mock_result.markdown = "Short"  # Less than 50 chars
            mock_convert.return_value = mock_result

            # Fallback will also return short text
            with patch("tools.fitz.open") as mock_fitz:
                mock_doc = MagicMock()
                mock_page = MagicMock()
                mock_page.get_text.return_value = "Too short"
                mock_doc.__iter__.side_effect = lambda: iter([mock_page])
                mock_fitz.return_value = mock_doc

                result = extract_text_from_pdf(b"test")
                assert result.startswith("Error:")
                assert "insufficient" in result.lower() or "enough text" in result.lower()


class TestScrapeJobDescription:
    """Unit tests for job description scraping logic."""

    @pytest.mark.asyncio
    async def test_rejects_invalid_url_format(self):
        """Verify URL validation logic."""
        # Test our validation code path
        result = await scrape_job_description("not-a-url")
        assert "Invalid URL" in result

        result = await scrape_job_description("ftp://example.com")
        assert "Invalid URL" in result

    @pytest.mark.asyncio
    async def test_constructs_jina_url_correctly(self):
        """Verify Jina URL construction."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.text = "content"
            mock_response.raise_for_status = MagicMock()

            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get

            await scrape_job_description("https://example.com/job")

            # Verify we called the right URL
            called_url = mock_get.call_args[0][0]
            assert called_url == "https://r.jina.ai/https://example.com/job"

    @pytest.mark.asyncio
    async def test_detects_empty_response(self):
        """Verify empty content detection logic."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.text = "   \n\t  "  # Whitespace only
            mock_response.raise_for_status = MagicMock()

            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            result = await scrape_job_description("https://example.com")

            # Test our empty/short detection logic
            assert "Error" in result
            assert "empty" in result.lower() or "too short" in result.lower()

    @pytest.mark.asyncio
    async def test_detects_short_response(self):
        """Verify short content detection logic."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.text = "This is a very short job description that should be rejected."
            mock_response.raise_for_status = MagicMock()

            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            result = await scrape_job_description("https://example.com")

            assert "Error" in result
            assert "too short" in result.lower()

    @pytest.mark.asyncio
    async def test_handles_http_errors_correctly(self):
        """Verify HTTP error handling returns proper messages."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 403

            async def raise_http_error(*args, **kwargs):
                raise httpx.HTTPStatusError("Forbidden", request=MagicMock(), response=mock_response)

            mock_client.return_value.__aenter__.return_value.get = raise_http_error

            result = await scrape_job_description("https://example.com")

            # Test our error message formatting
            assert "403" in result
            assert "Failed to fetch" in result

    @pytest.mark.asyncio
    async def test_handles_connection_errors(self):
        """Verify connection error handling."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.ConnectError("Network unreachable")
            )

            result = await scrape_job_description("https://example.com")

            # Test our connection error message
            assert "Could not connect" in result
            assert "internet connection" in result


# Integration Tests (require actual resources)
class TestPDFExtractionIntegration:
    """Integration tests with real PDF processing."""

    @pytest.mark.integration
    def test_extract_from_real_pdf(self):
        """Test with an actual minimal PDF."""
        # Minimal valid PDF (1 page, "Hello World" + more text)
        minimal_pdf = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 150>>stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
0 -20 Td
(This is a longer test PDF content to satisfy the length requirements of the JobFit application. ) Tj
0 -20 Td
(It needs to be at least 50 characters long to pass the validation check.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000115 00000 n
0000000214 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
412
%%EOF"""

        result = extract_text_from_pdf(minimal_pdf)

        # Real test: Did extraction actually extract the text content?
        assert not result.startswith("Error:"), f"Extraction failed: {result}"

        # Verify the actual content we put in the PDF was extracted
        result_normalized = result.replace("\n", "").replace(" ", "")
        assert "HelloWorld" in result_normalized, f"Expected 'HelloWorld' in extracted text, got: {result}"

        # Should return non-empty text
        assert len(result.strip()) > 0
