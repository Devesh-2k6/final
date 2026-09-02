import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Optional, List

class Settings(BaseSettings):
    # JWT
    JWT_SECRET_KEY: str = Field(default="SUPER_SECRET_KEY_FOR_EXPIRYGO_CHANGE_ME")
    ACCESS_TOKEN_EXPIRE_DAYS: int = Field(default=30)
    
    # App & Frontend Settings
    DEBUG: bool = Field(default=True)
    CORS_ORIGINS: str = Field(default="*") # Can be comma-separated list of origins
    API_BASE_URL: str = Field(default="http://localhost:8000")
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    
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
    
    # SMTP Notification & Verification Settings
    SMTP_HOST: str = Field(default="")
    SMTP_PORT: str = Field(default="587")
    SMTP_USER: str = Field(default="")
    SMTP_USERNAME: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_SENDER: str = Field(default="")
    SMTP_FROM: str = Field(default="")
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(default=24)
    EMAIL_RESEND_COOLDOWN_SECONDS: int = Field(default=60)

    # Admin Settings
    ADMIN_EMAIL: str = Field(default="devpant2006@gmail.com")
    ADMIN_PASSWORD_HASH: str = Field(default="$2b$12$YXvuTHn/svY5OA9tDbO1luJ37gBWFkE92lSpBXWK5NVYORjw/HlHa")

    # Shop Location Verification Settings
    SHOP_LOCATION_VERIFICATION_ENABLED: bool = Field(default=True)
    SHOP_LOCATION_PROVIDER: str = Field(default="nominatim")
    SHOP_LOCATION_RADIUS_METERS: float = Field(default=100.0)
    NOMINATIM_BASE_URL: str = Field(default="https://nominatim.openstreetmap.org")
    NOMINATIM_USER_AGENT: str = Field(default="ExpiryGo-Location-Verifier/1.0 (contact: support@expirygo.com)")
    NOMINATIM_TIMEOUT_SECONDS: float = Field(default=10.0)

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
