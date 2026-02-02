FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for opencv-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY arkla-backend/requirements.txt .

# Install Python dependencies - FORCE headless opencv
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python 2>/dev/null || true && \
    pip install --no-cache-dir --force-reinstall opencv-python-headless

# Copy app
COPY arkla-backend/app ./app

# Create directories
RUN mkdir -p uploads database output

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]