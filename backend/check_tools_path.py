import os
import sys

# Add backend to path explicitly if needed, but uv run should handle it
print(f"CWD: {os.getcwd()}")
try:
    import tools

    print(f"Tools file: {tools.__file__}")
except ImportError as e:
    print(f"ImportError: {e}")

print(f"Path: {sys.path}")
