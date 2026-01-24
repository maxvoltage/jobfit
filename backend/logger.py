from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax

import config

console = Console()


def log_ai_interaction(title: str, content: str, color: str = "blue", format: str = "markdown"):
    """
    Print a colorful panel to the console for AI interactions.
    Only prints if config.DEBUG_PAYLOAD_LOGGING is True.
    """
    if not config.DEBUG_PAYLOAD_LOGGING:
        return

    panel = Panel(
        Syntax(content, format, theme="monokai", word_wrap=True),
        title=f"[bold {color}]{title}[/]",
        border_style=color,
        padding=(1, 2),
    )
    console.print(panel)


def log_debug(message: str):
    """Print a debug message if config.DEBUG is True."""
    if config.DEBUG:
        console.print(f"[bold blue]DEBUG:[/bold blue] {message}")


def log_error(message: str):
    """Print an error message (always printed)."""
    console.print(f"[bold red]ERROR:[/bold red] {message}")


async def log_requests_middleware(request, call_next):
    """Log incoming requests if DEBUG is enabled."""
    log_debug(f"🔵 REQUEST: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        log_debug(f"✅ RESPONSE: {response.status_code}")
        return response
    except Exception as e:
        log_error(f"❌ ERROR: {str(e)}")
        raise
