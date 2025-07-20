#!/bin/bash

# IR Dashboard Development Setup Script

echo "🚀 Setting up IR Dashboard System..."

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

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your Supabase credentials!"
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env with your Supabase URL and API key"
echo "2. Run the database setup in your Supabase dashboard (supabase-setup.sql)"
echo "3. Create 'ir-reports' storage bucket in Supabase"
echo "4. Update your OpenAI API key in parser/main.py"
echo ""
echo "🏃‍♂️ To start development:"
echo "Terminal 1: python server.py"
echo "Terminal 2: pnpm dev"
