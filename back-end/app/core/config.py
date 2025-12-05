from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Novel Writing Assistant"
    API_V1_STR: str = "/api"
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    DATABASE_URL: str

    # LLM & Embedding
    OPENAI_API_KEY: str
    LLM_BASE_URL: Optional[str] = None
    EMBEDDING_API_KEY: str
    EMBEDDING_BASE_URL: Optional[str] = None
    
    # External Services
    TAVILY_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
