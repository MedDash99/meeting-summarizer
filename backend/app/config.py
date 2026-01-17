from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    whisper_model: str = "large-v3"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    max_file_size_mb: int = 25
    allowed_extensions: list[str] = ["mp3", "wav", "m4a", "webm"]
    
    class Config:
        env_file = ".env"


settings = Settings()
