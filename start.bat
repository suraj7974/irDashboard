@echo off
title IR Dashboard Startup

echo 🚀 Starting IR Dashboard...
echo ================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python and try again.
    pause
    exit /b 1
)

REM Check if Node.js is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js/npm is not installed. Please install Node.js and try again.
    pause
    exit /b 1
)

echo ✅ All requirements met
echo.

REM Start the Python server
echo 🐍 Starting Python server...
cd server
start "IR Dashboard Server" cmd /k python server.py

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Start the client
echo ⚛️  Starting React client...
cd ..\client

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing client dependencies...
    npm install
)

REM Start the client
start "IR Dashboard Client" cmd /k npm run dev

echo.
echo 🎉 IR Dashboard is now running!
echo ================================
echo 📊 Dashboard: http://localhost:5173
echo 🔧 Server API: http://localhost:8000
echo.
echo Close both command windows to stop the services
echo.

pause
