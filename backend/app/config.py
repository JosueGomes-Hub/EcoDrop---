from pydantic_settings import BaseSettings
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    DB_USER: str = "postgres"
    DB_PASSWORD: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "ecodrop_db"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "*"
    CORS_ALLOW_ALL: bool = True

    model_config = {"env_file": str(ROOT_DIR / ".env"), "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
