import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in the project root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# LLM Configuration
LLM_NAME = os.getenv('LLM_NAME', 'openai:gpt-4o')

# API Keys (PydanticAI will automatically use these from environment)
# OPENAI_API_KEY - loaded from .env
# ANTHROPIC_API_KEY - loaded from .env
# MISTRAL_API_KEY - loaded from .env
# GOOGLE_API_KEY - loaded from .env

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./jobfit.db')

# Application Settings
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
