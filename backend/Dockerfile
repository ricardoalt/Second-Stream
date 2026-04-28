# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies required for compilation
RUN apt-get update && apt-get install -y \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.txt .
COPY pyproject.toml .

# Install Python dependencies (using requirements.minimal.txt)
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn==22.0.0


# Stage 2: Final production image
FROM python:3.11-slim

# Install system dependencies for WeasyPrint, Matplotlib, and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
  # System tools
  curl \
  netcat-traditional \
  # Fonts and emoji support
  fontconfig \
  fonts-noto-color-emoji \
  # WeasyPrint dependencies (PDF generation)
  libglib2.0-0 \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libharfbuzz-subset0 \
  libfontconfig1 \
  libcairo-gobject2 \
  libgdk-pixbuf-2.0-0 \
  libffi-dev \
  shared-mime-info \
  libcairo2 \
  libpangocairo-1.0-0 \
  libfreetype6-dev \
  libpng-dev \
  pkg-config \
  # Graphviz for diagrams (optional)
  graphviz \
  && fc-cache -f -v \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Clear Matplotlib cache to force rebuild with new fonts
RUN rm -rf /root/.cache/matplotlib

WORKDIR /app

# Copy pre-installed dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Copy and prepare wait script
COPY ./scripts/wait-for-services.sh /app/scripts/wait-for-services.sh
RUN chmod +x /app/scripts/wait-for-services.sh

# Ensure executables are in PATH
ENV PATH=/usr/local/bin:$PATH

# Create non-root user for security
RUN useradd -m appuser && \
  chown -R appuser:appuser /app && \
  mkdir -p /app/logs /app/storage && \
  chown -R appuser:appuser /app/logs /app/storage

USER appuser

# Pre-build Matplotlib font cache
RUN python -c "import matplotlib.font_manager" || true

# Expose port
EXPOSE 8000

# Entrypoint con wait-for-services
ENTRYPOINT ["/app/scripts/wait-for-services.sh"]

# ⚠️ Timeout 900s (15 min) for AI generation tasks (typical: 10 min)
# ⚠️ 6 workers for better concurrency without Celery (each can handle 10min task)
# ⚠️ forwarded-allow-ips: trust proxy headers only from VPC internal IPs (ALB)
CMD ["gunicorn", "app.main:app", \
  "--workers", "6", \
  "--worker-class", "uvicorn.workers.UvicornWorker", \
  "--bind", "0.0.0.0:8000", \
  "--forwarded-allow-ips", "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16", \
  "--log-level", "info", \
  "--timeout", "900", \
  "--graceful-timeout", "900", \
  "--max-requests", "100", \
  "--max-requests-jitter", "20"]
