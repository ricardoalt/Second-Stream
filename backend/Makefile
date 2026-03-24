.PHONY: help lint format check test test-file test-cov

# =============================================================================
# Help - Show available commands
# =============================================================================
help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | grep -v help | sed 's/:.*//' | column -t

# =============================================================================
# Code Quality (Local - ruff)
# =============================================================================
# Requiere: uv tool install ruff

# Check linting errors
lint:
	ruff check .

# Auto-fix linting errors
lint-fix:
	ruff check --fix .

# Auto-format all files
format:
	ruff format .

# Check formatting without changes
format-check:
	ruff format --check .

# Development mode: fix everything automatically
check:
	ruff check --fix .
	ruff format .

# =============================================================================
# Testing (Docker)
# =============================================================================
# Requiere: docker compose up -d postgres redis

# Run all tests
test:
	docker compose run --rm tests

# Run tests with coverage
test-cov:
	docker compose run --rm tests pytest --cov=app --cov-report=term

# Run specific test file
# Uso: make test-file FILE=tests/test_auth.py
test-file:
	docker compose run --rm tests pytest -v $(FILE)
