# IR Dashboard Server

FastAPI backend server for PDF processing and analysis.

## Features

- FastAPI web framework
- PDF text extraction using Tesseract OCR
- OpenAI integration for intelligent text analysis
- CORS support for cross-origin requests
- Environment-based configuration

## Prerequisites

- Python 3.8+
- pip3
- Tesseract OCR

## Setup

1. Run the setup script:

   ```bash
   ./setup.sh
   ```

2. Install Tesseract OCR:

   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr tesseract-ocr-hin`
   - **macOS**: `brew install tesseract`
   - **Windows**: Download from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)

3. Update environment variables in `.env`:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8000
   HOST=0.0.0.0
   ALLOWED_ORIGINS=http://localhost:5173,your_deployed_client_url
   ```

## Development

Start the development server:

```bash
python server.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:

- API Documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Deployment

### Using Uvicorn directly:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

### For production deployment:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

The server can be deployed to:

- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS EC2/ECS
- Google Cloud Run

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key for text analysis
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## API Endpoints

- `GET /`: Health check
- `GET /health`: Detailed health status
- `POST /process-pdf`: Upload and process PDF files
