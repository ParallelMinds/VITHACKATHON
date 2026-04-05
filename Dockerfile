# ═══════════════════════════════════════════════
# Project Aegis — Docker Container
# Intelligent Cargo X-ray Risk Screening
# Roboflow Workflow API (NO local YOLO)
# ═══════════════════════════════════════════════

FROM python:3.10-slim

# System deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (cache layer)
COPY requirements_demo.txt .
RUN pip install --no-cache-dir -r requirements_demo.txt gunicorn eventlet

# Copy application code
COPY backend/app.py backend/config.yaml backend/inference.py ./
COPY backend/local_intelligence.py backend/manifest_audit.py ./
COPY backend/historical_risk.py backend/news_intelligence.py ./
COPY backend/llm_assistant.py ./

# Copy web assets
COPY frontend/static/ static/
COPY frontend/templates/ templates/

# Create outputs directory
RUN mkdir -p outputs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/status')" || exit 1

# Run with gunicorn for production
CMD ["gunicorn", \
     "--worker-class", "eventlet", \
     "--workers", "1", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
    "app:app"]
