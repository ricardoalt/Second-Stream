"""Voice transcription service."""

from __future__ import annotations

from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import settings


@dataclass(frozen=True)
class VoiceTranscriptionResult:
    text: str
    model: str


class VoiceTranscriptionService:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self._model = "gpt-4o-transcribe"

    async def transcribe_audio(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> VoiceTranscriptionResult:
        response = await self._client.audio.transcriptions.create(
            model=self._model,
            file=(filename, audio_bytes, content_type),
        )
        text = (response.text or "").strip()
        return VoiceTranscriptionResult(text=text, model=self._model)


voice_transcription_service = VoiceTranscriptionService()
