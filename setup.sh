#!/bin/bash

# IR Dashboard System Setup Script

echo "🚀 Setting up IR Dashboard System..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed. Install with: npm install -g pnpm"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup server
echo ""
echo "🐍 Setting up server..."
cd server/
./setup.sh
cd ..

# Setup client
echo ""
echo "⚛️ Setting up client..."
cd client/
./setup.sh
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Final steps:"
echo "1. Set up your Supabase database using supabase-setup.sql"
echo "2. Update server/.env with your OpenAI API key"
echo "3. Update client/.env with your Supabase credentials"
echo "4. Install Tesseract OCR on your system"
echo ""
echo "🏃‍♂️ To start development:"
echo "Terminal 1: cd server && python server.py"
echo "Terminal 2: cd client && pnpm dev"
echo ""
echo "📖 See README.md for detailed instructions"
