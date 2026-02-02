FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY arkla-backend/requirements.txt .

# Uninstall opencv-python jika ada, install headless version
RUN pip install --no-cache-dir --upgrade pip && \
    pip uninstall -y opencv-python opencv-python-headless 2>/dev/null || true && \
    pip install --no-cache-dir opencv-python-headless && \
    pip install --no-cache-dir -r requirements.txt

# Copy app
COPY arkla-backend/app ./app

# Create directories
RUN mkdir -p uploads database output

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]