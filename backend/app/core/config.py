from pydantic_settings import BaseSettings
from typing import Optional
import json
import os

class Settings(BaseSettings):
    # Database
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "rewards_db"
    
    # Security
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    EXPOSE_RESET_TOKEN_IN_RESPONSE: bool = False
    ENV: str = "development"
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Rewards & Recognition API"
    VERSION: str = "1.0.0"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = []
    
    # Gemini API Key
    GEMINI_API_KEY: Optional[str] = None

    # Notifications
    EMAIL_NOTIFICATIONS_ENABLED: bool = False

    def __init__(self, **values):
        super().__init__(**values)
        if self.ENV == "development":
            env_override = os.getenv("ENVIRONMENT")
            if env_override:
                self.ENV = env_override

        env = (self.ENV or "").lower()
        is_dev = env in {"development", "dev", "local"}

        if not self.SECRET_KEY:
            if is_dev:
                self.SECRET_KEY = "dev-secret-key"
            else:
                raise ValueError("SECRET_KEY is required unless ENV=development.")

        if isinstance(self.GEMINI_API_KEY, str) and not self.GEMINI_API_KEY.strip():
            self.GEMINI_API_KEY = None

        cors_env = os.getenv("BACKEND_CORS_ORIGINS")
        if cors_env:
            self.BACKEND_CORS_ORIGINS = self._parse_cors_origins(cors_env)
        elif is_dev:
            self.BACKEND_CORS_ORIGINS = ["http://localhost:3000"]

        expose_env = os.getenv("EXPOSE_RESET_TOKEN_IN_RESPONSE")
        if expose_env is not None:
            self.EXPOSE_RESET_TOKEN_IN_RESPONSE = expose_env.lower() == "true"
        else:
            self.EXPOSE_RESET_TOKEN_IN_RESPONSE = is_dev

    @staticmethod
    def _parse_cors_origins(value: str) -> list:
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            parsed = None

        if isinstance(parsed, list):
            return [origin for origin in parsed if isinstance(origin, str) and origin.strip()]

        return [origin.strip() for origin in value.split(",") if origin.strip()]
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
