#!/bin/bash

# IR Dashboard Client Setup Script

echo "🚀 Setting up IR Dashboard Client..."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed. Install with: npm install -g pnpm"
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your Supabase credentials and server URL!"
fi

echo "✅ Client setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env with your Supabase URL and API key"
echo "2. Update VITE_PARSER_API_URL in .env to point to your deployed server"
echo "3. Run the database setup in your Supabase dashboard (../supabase-setup.sql)"
echo "4. Create 'ir-reports' storage bucket in Supabase"
echo ""
echo "🏃‍♂️ To start development:"
echo "pnpm dev"
echo ""
echo "🏗️ To build for production:"
echo "pnpm build"
