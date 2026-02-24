"""Voice interview constants."""

MAX_UPLOAD_BYTES = 25_000_000
MAX_PROCESSING_ATTEMPTS = 3

ALLOWED_VOICE_EXTENSIONS = {".mp3", ".wav", ".m4a"}
ALLOWED_VOICE_MIME_BY_EXTENSION = {
    ".mp3": {"audio/mpeg", "audio/mp3"},
    ".wav": {"audio/wav", "audio/x-wav", "audio/wave"},
    ".m4a": {"audio/mp4", "audio/x-m4a", "audio/m4a"},
}

AUDIO_RETENTION_DAYS = 180
TRANSCRIPT_RETENTION_DAYS = 730
