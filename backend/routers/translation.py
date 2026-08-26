from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from services.ai import translate_text, translate_batch, LANGUAGE_NAMES

router = APIRouter(prefix="/translate", tags=["Translation"])

class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(default="hi", description="Target language code: en, hi, ta, te, kn")
    source_language: Optional[str] = Field(default="en", description="Source language code")

class BatchTranslationRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to translate")
    target_language: str = Field(default="hi", description="Target language code: en, hi, ta, te, kn")

class TranslationResponse(BaseModel):
    translated_text: str
    target_language: str
    confidence: float
    engine: Optional[str] = "gemini"

class BatchTranslationResponse(BaseModel):
    translations: List[TranslationResponse]
    target_language: str

@router.get("/languages")
def get_supported_languages():
    """Returns the list of supported languages for the ExpiryGo application."""
    return [
        {"code": "en", "name": "English", "native_name": "English", "is_default": True},
        {"code": "hi", "name": "Hindi", "native_name": "हिंदी", "is_default": False},
        {"code": "ta", "name": "Tamil", "native_name": "தமிழ்", "is_default": False},
        {"code": "te", "name": "Telugu", "native_name": "తెలుగు", "is_default": False},
        {"code": "kn", "name": "Kannada", "native_name": "ಕನ್ನಡ", "is_default": False},
    ]

@router.post("/", response_model=TranslationResponse)
async def translate_single(payload: TranslationRequest):
    """Translates a single string into the target language."""
    res = await translate_text(
        text=payload.text,
        target_lang=payload.target_language,
        source_lang=payload.source_language or "en"
    )
    return res

@router.post("/batch", response_model=BatchTranslationResponse)
async def translate_multiple(payload: BatchTranslationRequest):
    """Translates a list of strings into the target language concurrently."""
    results = await translate_batch(texts=payload.texts, target_lang=payload.target_language)
    return {
        "translations": results,
        "target_language": payload.target_language
    }
