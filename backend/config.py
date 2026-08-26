import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Optional, List

class Settings(BaseSettings):
    # JWT
    JWT_SECRET_KEY: str = Field(default="SUPER_SECRET_KEY_FOR_EXPIRYGO_CHANGE_ME")
    ACCESS_TOKEN_EXPIRE_DAYS: int = Field(default=30)
    
    # App Settings
    DEBUG: bool = Field(default=True)
    CORS_ORIGINS: str = Field(default="*") # Can be comma-separated list of origins
    API_BASE_URL: str = Field(default="http://localhost:8000")
    
    # Database Settings
    DATABASE_URL: str = Field(default="sqlite:///./expirygo_local_dev.db")
    
    # Supabase (Postgres & Storage)
    SUPABASE_URL: Optional[str] = Field(default=None)
    SUPABASE_ANON_KEY: Optional[str] = Field(default=None)
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    GOOGLE_MAPS_PLATFORM_KEY: Optional[str] = Field(default=None)
    FAST2SMS_API_KEY: Optional[str] = Field(default=None)
    REDIS_URL: str = Field(default="redis://localhost:6379")
    
    # SMTP Notification Settings
    SMTP_HOST: str = Field(default="")
    SMTP_PORT: str = Field(default="")
    SMTP_USER: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_SENDER: str = Field(default="no-reply@expirygo.com")

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def clean_quotes(self) -> 'Settings':
        for field_name in type(self).model_fields:
            value = getattr(self, field_name)
            if isinstance(value, str):
                cleaned = value.strip().strip('"').strip("'")
                setattr(self, field_name, cleaned)
        
        # Fix common project ID typos from Render environment variables
        if self.DATABASE_URL and "db.htdgntprwcdjazbikozb.supabase.co" in self.DATABASE_URL:
            self.DATABASE_URL = self.DATABASE_URL.replace(
                "db.htdgntprwcdjazbikozb.supabase.co",
                "db.hfdgntprwcdjazbikozb.supabase.co"
            )
        if self.SUPABASE_URL and "htdgntprwcdjazbikozb.supabase.co" in self.SUPABASE_URL:
            self.SUPABASE_URL = self.SUPABASE_URL.replace(
                "htdgntprwcdjazbikozb.supabase.co",
                "hfdgntprwcdjazbikozb.supabase.co"
            )
        return self

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
