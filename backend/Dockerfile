# =====================================================================
# Sanatan Saathi — Backend container
# WORKDIR mirrors the host path /app/backend so the hardcoded absolute
# paths inside server.py (e.g. /app/backend/static/audio) Just Work
# without any code change.
# =====================================================================
FROM python:3.11-slim

# System deps for Pillow / lxml / cryptography wheels and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl build-essential \
        libjpeg62-turbo libpng16-16 zlib1g \
        libxml2 libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# Match the host project layout so absolute paths in server.py resolve.
WORKDIR /app/backend

# Install Python deps in a separate layer for cache efficiency.
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# App source is bind-mounted in docker-compose at /app/backend. Copy as
# fallback so the image still runs without a volume.
COPY . /app/backend

EXPOSE 8001

# --reload picks up changes in the bind-mounted source tree.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
