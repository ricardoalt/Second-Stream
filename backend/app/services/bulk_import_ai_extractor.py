"""AI-first extractor adapter for bulk import (PDF/XLSX/DOCX)."""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.agents.bulk_import_extraction_agent import (
    BulkImportExtractionAgentError,
    run_bulk_import_extraction_agent,
    run_bulk_import_extraction_agent_on_text,
)
from app.models.bulk_import_ai_output import (
    BulkImportAILocationOutput,
    BulkImportAIOutput,
    BulkImportAIWasteStreamOutput,
)
from app.services.document_text_extractor import (
    ExtractedTextResult,
    extract_docx_text,
    extract_xlsx_text,
)

AI_EXTRACTION_TIMEOUT_SECONDS = 120.0

_MONTH_PATTERN = re.compile(
    r"\b(?:jan|january|ene|enero|feb|february|febrero|mar|march|marzo|apr|april|abr|abril|may|mayo|jun|june|junio|jul|july|julio|aug|august|ago|agosto|sep|september|septiembre|oct|october|octubre|nov|november|noviembre|dec|december|dic|diciembre)\b",
    re.IGNORECASE,
)
_YEAR_PATTERN = re.compile(r"\b(?:19|20)\d{2}\b")


@dataclass
class ParsedRow:
    location_data: dict[str, str] | None
    project_data: dict[str, str] | None
    raw: dict[str, str]


class BulkImportAIExtractorError(Exception):
    """Typed AI extraction error with normalized code."""

    def __init__(self, code: str, *, diagnostics: ExtractionDiagnostics | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.diagnostics = diagnostics


@dataclass(frozen=True)
class ExtractionDiagnostics:
    route: str
    char_count: int | None
    truncated: bool | None


@dataclass(frozen=True)
class ExtractionResult:
    rows: list[ParsedRow]
    diagnostics: ExtractionDiagnostics


class BulkImportAIExtractor:
    """Runs AI extraction and adapts output to ParsedRow contract."""

    async def extract_parsed_rows(
        self,
        *,
        file_bytes: bytes,
        filename: str,
    ) -> ExtractionResult:
        extension = Path(filename).suffix.casefold()

        if extension == ".pdf":
            diagnostics = ExtractionDiagnostics(
                route="pdf_binary",
                char_count=None,
                truncated=None,
            )
            try:
                rows = await self._extract_from_binary(file_bytes=file_bytes, filename=filename)
            except BulkImportAIExtractorError as exc:
                raise BulkImportAIExtractorError(exc.code, diagnostics=diagnostics) from exc
            return ExtractionResult(rows=rows, diagnostics=diagnostics)

        if extension == ".xlsx":
            extracted = self._extract_local_text(
                file_bytes=file_bytes,
                route="xlsx_text",
                parser=extract_xlsx_text,
                error_code="xlsx_parse_failed",
            )
            diagnostics = ExtractionDiagnostics(
                route="xlsx_text",
                char_count=extracted.char_count,
                truncated=extracted.truncated,
            )
            if not extracted.text.strip():
                return ExtractionResult(rows=[], diagnostics=diagnostics)
            try:
                rows = await self._extract_from_text(
                    extracted_text=extracted.text,
                    filename=filename,
                )
            except BulkImportAIExtractorError as exc:
                raise BulkImportAIExtractorError(exc.code, diagnostics=diagnostics) from exc
            return ExtractionResult(rows=rows, diagnostics=diagnostics)

        if extension == ".docx":
            extracted = self._extract_local_text(
                file_bytes=file_bytes,
                route="docx_text",
                parser=extract_docx_text,
                error_code="docx_parse_failed",
            )
            diagnostics = ExtractionDiagnostics(
                route="docx_text",
                char_count=extracted.char_count,
                truncated=extracted.truncated,
            )
            if not extracted.text.strip():
                return ExtractionResult(rows=[], diagnostics=diagnostics)
            try:
                rows = await self._extract_from_text(
                    extracted_text=extracted.text,
                    filename=filename,
                )
            except BulkImportAIExtractorError as exc:
                raise BulkImportAIExtractorError(exc.code, diagnostics=diagnostics) from exc
            return ExtractionResult(rows=rows, diagnostics=diagnostics)

        raise BulkImportAIExtractorError("unsupported_file_type")

    async def extract_parsed_rows_from_text(
        self,
        *,
        extracted_text: str,
        filename: str,
    ) -> ExtractionResult:
        diagnostics = ExtractionDiagnostics(
            route="voice_text",
            char_count=len(extracted_text),
            truncated=False,
        )
        if not extracted_text.strip():
            return ExtractionResult(rows=[], diagnostics=diagnostics)
        try:
            rows = await self._extract_from_text(extracted_text=extracted_text, filename=filename)
        except BulkImportAIExtractorError as exc:
            raise BulkImportAIExtractorError(exc.code, diagnostics=diagnostics) from exc
        return ExtractionResult(rows=rows, diagnostics=diagnostics)

    async def _extract_from_binary(self, *, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        media_type = self._media_type_for_extension(Path(filename).suffix.casefold())
        output = await self._run_agent(
            lambda: run_bulk_import_extraction_agent(
                file_bytes=file_bytes,
                filename=filename,
                media_type=media_type,
            )
        )
        return self._to_parsed_rows(output)

    async def _extract_from_text(
        self,
        *,
        extracted_text: str,
        filename: str,
    ) -> list[ParsedRow]:
        output = await self._run_agent(
            lambda: run_bulk_import_extraction_agent_on_text(
                extracted_text=extracted_text,
                filename=filename,
            )
        )
        return self._to_parsed_rows(output)

    async def _run_agent(
        self,
        runner: Callable[[], Awaitable[BulkImportAIOutput]],
    ) -> BulkImportAIOutput:
        try:
            output = await asyncio.wait_for(
                runner(),
                timeout=AI_EXTRACTION_TIMEOUT_SECONDS,
            )
            return BulkImportAIOutput.model_validate(output)
        except TimeoutError as exc:
            raise BulkImportAIExtractorError("ai_timeout") from exc
        except ValidationError as exc:
            raise BulkImportAIExtractorError("ai_schema_invalid") from exc
        except BulkImportExtractionAgentError as exc:
            message = str(exc).casefold()
            if "schema" in message or "validation" in message:
                raise BulkImportAIExtractorError("ai_schema_invalid") from exc
            raise BulkImportAIExtractorError("ai_provider_error") from exc

    def _extract_local_text(
        self,
        *,
        file_bytes: bytes,
        route: str,
        parser: Callable[[bytes], ExtractedTextResult],
        error_code: str,
    ) -> ExtractedTextResult:
        try:
            return parser(file_bytes)
        except Exception as exc:
            message = str(exc)
            if message in {"xlsx_parser_unavailable", "docx_parser_unavailable"}:
                raise BulkImportAIExtractorError(
                    message,
                    diagnostics=ExtractionDiagnostics(
                        route=route,
                        char_count=None,
                        truncated=None,
                    ),
                ) from exc
            raise BulkImportAIExtractorError(
                error_code,
                diagnostics=ExtractionDiagnostics(
                    route=route,
                    char_count=None,
                    truncated=None,
                ),
            ) from exc

    def _media_type_for_extension(self, extension: str) -> str:
        if extension == ".pdf":
            return "application/pdf"
        raise BulkImportAIExtractorError("unsupported_file_type")

    def _to_parsed_rows(self, output: BulkImportAIOutput) -> list[ParsedRow]:
        collapsed_streams = self._collapse_streams(output.waste_streams)
        if not collapsed_streams:
            return []

        location_rows, location_lookup = self._build_location_maps(output.locations)
        rows: list[ParsedRow] = list(location_rows)

        for stream in collapsed_streams:
            location_data = self._resolve_location_for_stream(stream, location_lookup)
            metadata_text = self._serialize_metadata(stream.metadata)
            raw = {
                "stream_confidence": str(stream.confidence),
                "stream_evidence": " | ".join(stream.evidence),
                "stream_location_ref": stream.location_ref or "",
                "stream_metadata": metadata_text,
            }

            project_data: dict[str, str] = {
                "name": stream.name,
                "category": stream.category or "",
                "project_type": "Assessment",
                "description": stream.description or "",
                "sector": "",
                "subsector": "",
                "estimated_volume": "",
            }

            if location_data is not None:
                raw["location_confidence"] = str(location_data.confidence)
                raw["location_evidence"] = " | ".join(location_data.evidence)

            rows.append(
                ParsedRow(
                    location_data={
                        "name": location_data.name,
                        "city": location_data.city,
                        "state": location_data.state,
                        "address": location_data.address or "",
                    }
                    if location_data
                    else None,
                    project_data=project_data,
                    raw=raw,
                )
            )

        return rows

    def _build_location_maps(
        self,
        locations: list[BulkImportAILocationOutput],
    ) -> tuple[list[ParsedRow], dict[str, BulkImportAILocationOutput]]:
        location_lookup: dict[str, BulkImportAILocationOutput] = {}
        rows: list[ParsedRow] = []
        for location in locations:
            key = self._location_ref_key(location.name)
            location_lookup[key] = location
            rows.append(
                ParsedRow(
                    location_data={
                        "name": location.name,
                        "city": location.city,
                        "state": location.state,
                        "address": location.address or "",
                    },
                    project_data=None,
                    raw={
                        "location_confidence": str(location.confidence),
                        "location_evidence": " | ".join(location.evidence),
                    },
                )
            )
        return rows, location_lookup

    def _resolve_location_for_stream(
        self,
        stream: BulkImportAIWasteStreamOutput,
        location_lookup: dict[str, BulkImportAILocationOutput],
    ) -> BulkImportAILocationOutput | None:
        if not stream.location_ref:
            return None
        return location_lookup.get(self._location_ref_key(stream.location_ref))

    def _collapse_streams(
        self,
        streams: list[BulkImportAIWasteStreamOutput],
    ) -> list[BulkImportAIWasteStreamOutput]:
        collapsed: dict[tuple[str, str], BulkImportAIWasteStreamOutput] = {}

        for stream in streams:
            concept = self._normalize_stream_concept(stream.name)
            location_ref = self._location_ref_key(stream.location_ref or "")
            key = (concept, location_ref)

            existing = collapsed.get(key)
            if existing is None:
                collapsed[key] = stream
                continue

            merged_evidence = list(dict.fromkeys([*existing.evidence, *stream.evidence]))
            merged_metadata = self._merge_metadata(existing.metadata, stream.metadata)
            category, merged_metadata = self._merge_stream_category(
                existing=existing,
                incoming=stream,
                merged_metadata=merged_metadata,
            )
            description = existing.description or stream.description
            if (
                stream.description
                and existing.description
                and len(stream.description) > len(existing.description)
            ):
                description = stream.description

            collapsed[key] = BulkImportAIWasteStreamOutput(
                name=existing.name,
                category=category,
                location_ref=existing.location_ref or stream.location_ref,
                description=description,
                metadata=merged_metadata,
                confidence=max(existing.confidence, stream.confidence),
                evidence=merged_evidence[:10],
            )

        return list(collapsed.values())

    def _merge_stream_category(
        self,
        *,
        existing: BulkImportAIWasteStreamOutput,
        incoming: BulkImportAIWasteStreamOutput,
        merged_metadata: dict[str, Any] | None,
    ) -> tuple[str | None, dict[str, Any] | None]:
        existing_category = (existing.category or "").strip()
        incoming_category = (incoming.category or "").strip()

        if not existing_category and not incoming_category:
            return None, merged_metadata
        if not existing_category:
            return incoming_category, merged_metadata
        if not incoming_category:
            return existing_category, merged_metadata

        if self._normalize_token(existing_category) == self._normalize_token(incoming_category):
            return existing_category, merged_metadata

        if incoming.confidence > existing.confidence:
            preferred = incoming_category
            alternate = existing_category
        else:
            preferred = existing_category
            alternate = incoming_category

        metadata_with_alternate = self._append_category_alternate_metadata(
            merged_metadata,
            alternate,
        )
        return preferred, metadata_with_alternate

    def _append_category_alternate_metadata(
        self,
        metadata: dict[str, Any] | None,
        alternate_category: str,
    ) -> dict[str, Any] | None:
        normalized_alternate = self._normalize_token(alternate_category)
        if not normalized_alternate:
            return metadata

        next_metadata = dict(metadata) if metadata is not None else {}
        alternates: list[str] = []
        existing_alt_values = next_metadata.get("category_alternates")
        if isinstance(existing_alt_values, list):
            for value in existing_alt_values:
                if not isinstance(value, str):
                    continue
                cleaned = value.strip()
                if cleaned:
                    alternates.append(cleaned)

        legacy_alt = next_metadata.get("category_alt")
        if isinstance(legacy_alt, str):
            cleaned_legacy_alt = legacy_alt.strip()
            if cleaned_legacy_alt:
                alternates.append(cleaned_legacy_alt)

        seen: set[str] = set()
        deduped: list[str] = []
        for value in [*alternates, alternate_category.strip()]:
            normalized_value = self._normalize_token(value)
            if not normalized_value or normalized_value in seen:
                continue
            seen.add(normalized_value)
            deduped.append(value)

        next_metadata["category_alternates"] = deduped
        return next_metadata

    def _normalize_stream_concept(self, value: str) -> str:
        text_value = self._normalize_token(value)
        text_value = _MONTH_PATTERN.sub(" ", text_value)
        text_value = _YEAR_PATTERN.sub(" ", text_value)
        return self._normalize_token(text_value)

    def _normalize_token(self, value: str) -> str:
        lowered = value.strip().casefold()
        lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
        return " ".join(lowered.split())

    def _location_ref_key(self, value: str) -> str:
        return self._normalize_token(value)

    def _serialize_metadata(self, metadata: dict[str, Any] | None) -> str:
        if metadata is None:
            return ""
        return json.dumps(metadata, sort_keys=True, separators=(",", ":"))

    def _merge_metadata(
        self,
        base: dict[str, Any] | None,
        incoming: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        if base is None and incoming is None:
            return None
        merged: dict[str, Any] = {}
        if base:
            merged.update(base)
        if incoming:
            for key, value in incoming.items():
                existing = merged.get(key)
                if existing is None:
                    merged[key] = value
                    continue
                if existing == value:
                    continue
                merged[f"{key}_alt"] = value
        return merged


bulk_import_ai_extractor = BulkImportAIExtractor()
