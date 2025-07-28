from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from dotenv import load_dotenv
import tempfile
import os
import sys
import json

# Load .env file
load_dotenv()

# Setup FastAPI app
app = FastAPI(title="IR Parser API", description="API for processing IR PDF documents")

# Allow CORS for specific origins
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000"
).split(",")

print("CORS allowed origins:", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include parser directory in path
parser_dir = Path(__file__).parent / "parser"
sys.path.append(str(parser_dir))

# Import parsing functions
try:
    from parser.main import extract_text_from_pdf, get_structured_summary
except ImportError as e:
    print("Failed to import parser functions:", e)
    sys.exit(1)

# Routes
@app.get("/")
async def root():
    return {"message": "IR Parser API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ir-parser-api"}

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file and returns extracted structured data.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        try:
            # Save file
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

            print(f"Processing file: {file.filename}")

            # Parse text and structure
            extracted_text = extract_text_from_pdf(temp_file.name)
            print("Extracted text, getting structured summary...")
            summary_json = get_structured_summary(extracted_text)

            # Clean markdown formatting if present
            if summary_json.startswith("```json"):
                summary_json = summary_json.split("```json")[1].split("```")[0]
            elif summary_json.startswith("```"):
                summary_json = summary_json.split("```")[1].split("```")[0]

            # Convert to dict
            parsed_data = json.loads(summary_json)

            return JSONResponse(
                content={
                    "success": True,
                    "filename": file.filename,
                    "data": parsed_data,
                    "raw_text_length": len(extracted_text),
                }
            )

        except json.JSONDecodeError as e:
            print("JSON parse error:", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse AI response as JSON: {str(e)}"
            )
        except Exception as e:
            print("Processing error:", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process PDF: {str(e)}"
            )
        finally:
            try:
                os.unlink(temp_file.name)
            except:
                pass

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
        },
    )

# Run server
if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting server at http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=True)
