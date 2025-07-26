#!/bin/bash

# IR Dashboard Server Setup Script

echo "🚀 Setting up IR Dashboard Server..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your OpenAI API key and other configurations!"
fi

echo "✅ Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env with your OpenAI API key"
echo "2. Update ALLOWED_ORIGINS in .env with your client URLs"
echo "3. Install Tesseract OCR on your system:"
echo "   - Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-hin"
echo "   - macOS: brew install tesseract"
echo "   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
echo ""
echo "🏃‍♂️ To start development:"
echo "python server.py"
echo ""
echo "🚀 For production deployment:"
echo "uvicorn server:app --host 0.0.0.0 --port 8000"
