# ── Lion Kings Bank — Django backend ──────────────────────────────────────────
# Multi-stage build: keeps the final image lean by not including build tools.

# Stage 1: dependency install
FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies into an isolated prefix so we can copy them cleanly
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: runtime image
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Environment defaults (override via docker-compose or -e flags)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=false \
    DJANGO_ALLOWED_HOSTS="localhost 127.0.0.1 0.0.0.0"

# Collect static files at build time
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Entrypoint: run migrations then start gunicorn
CMD ["sh", "-c", \
     "mkdir -p /app/data && \
      python manage.py migrate --noinput && \
      python manage.py create_default_admin && \
      python manage.py seed_demo_data && \
      gunicorn extra_credit_union.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 2 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -"]

