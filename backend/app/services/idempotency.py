"""Idempotency hashing helpers."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_sha256(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
