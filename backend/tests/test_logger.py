import pytest
from unittest.mock import patch, MagicMock
import config
from logger import log_ai_interaction, log_debug, log_error

class TestLogger:
    """Test the logging utility functions."""

    @patch('logger.console')
    @patch('config.DEBUG_PAYLOAD_LOGGING', True)
    def test_log_ai_interaction_enabled(self, mock_console):
        """Test log_ai_interaction prints when enabled."""
        log_ai_interaction("Test Title", "Test Content")
        
        # Verify print was called
        mock_console.print.assert_called_once()
        
        # Verify call arguments (checking it was called with a Panel)
        args, _ = mock_console.print.call_args
        from rich.panel import Panel
        assert isinstance(args[0], Panel)
        # title is likely a string like "[bold blue]Test Title[/]"
        assert "Test Title" in str(args[0].title)

    @patch('logger.console')
    @patch('config.DEBUG_PAYLOAD_LOGGING', False)
    def test_log_ai_interaction_disabled(self, mock_console):
        """Test log_ai_interaction does not print when disabled."""
        log_ai_interaction("Test Title", "Test Content")
        
        mock_console.print.assert_not_called()

    @patch('logger.console')
    @patch('config.DEBUG', True)
    def test_log_debug_enabled(self, mock_console):
        """Test log_debug prints when enabled."""
        log_debug("Test Debug Message")
        
        mock_console.print.assert_called_once()
        args, _ = mock_console.print.call_args
        assert "Test Debug Message" in str(args[0])

    @patch('logger.console')
    @patch('config.DEBUG', False)
    def test_log_debug_disabled(self, mock_console):
        """Test log_debug does not print when disabled."""
        log_debug("Test Debug Message")
        
        mock_console.print.assert_not_called()

    @patch('logger.console')
    def test_log_error_always_prints(self, mock_console):
        """Test log_error always prints regardless of config."""
        # Test with DEBUG=True
        with patch('config.DEBUG', True):
            log_error("Test Error Message 1")
            mock_console.print.assert_called_once()
            mock_console.print.reset_mock()

        # Test with DEBUG=False
        with patch('config.DEBUG', False):
            log_error("Test Error Message 2")
            mock_console.print.assert_called_once() 
