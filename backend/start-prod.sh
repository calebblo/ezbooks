#!/bin/bash
# Production startup script for EzBooks backend
# This script runs the backend with production-ready settings

set -e  # Exit on error

echo "Starting EzBooks Backend in Production Mode..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Run 'python -m venv venv' first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Validate environment variables (will fail fast if missing)
echo "Validating configuration..."
python -c "from app.core import config; print('✓ Configuration validated')"

# Start server with production settings
echo "Starting Uvicorn server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers ${WORKERS:-4} \
    --log-level info \
    --no-access-log \
    --proxy-headers
