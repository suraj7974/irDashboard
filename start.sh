#!/bin/bash

# IR Dashboard Startup Script
# This script starts both the server and client components

echo "🚀 Starting IR Dashboard..."
echo "================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill processes on script exit
cleanup() {
    echo ""
    echo "🔄 Shutting down IR Dashboard..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "✅ Server stopped"
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null
        echo "✅ Client stopped"
    fi
    echo "👋 Goodbye!"
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if required tools are installed
echo "🔍 Checking requirements..."

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Node.js/npm is not installed. Please install Node.js and try again."
    exit 1
fi

echo "✅ All requirements met"
echo ""

# Start the Python server
echo "🐍 Starting Python server..."
cd server
python3 server.py &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
else
    echo "❌ Failed to start server"
    exit 1
fi

# Start the client
echo "⚛️  Starting React client..."
cd ../client

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing client dependencies..."
    npm install
fi

# Start the client in development mode
npm run dev &
CLIENT_PID=$!

# Wait a moment for client to start
sleep 3

# Check if client is running
if kill -0 $CLIENT_PID 2>/dev/null; then
    echo "✅ Client started successfully (PID: $CLIENT_PID)"
else
    echo "❌ Failed to start client"
    cleanup
    exit 1
fi

echo ""
echo "🎉 IR Dashboard is now running!"
echo "================================"
echo "📊 Dashboard: http://localhost:5173"
echo "🔧 Server API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
