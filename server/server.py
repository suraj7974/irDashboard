from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from dotenv import load_dotenv
import tempfile
import os
import sys
import json

# Load environment variables from .env
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="IR Parser API", description="Processes IR PDFs and returns structured data.")

# Load allowed origins from environment or fallback to common local dev
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

print("✅ Allowed CORS Origins:", allowed_origins)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import parser functions from parser/main.py
parser_dir = Path(__file__).parent / "parser"
sys.path.append(str(parser_dir))

try:
    from parser.main import extract_text_from_pdf, get_structured_summary
except ImportError as e:
    print("❌ Could not import parser functions:", e)
    sys.exit(1)

# ---------------- ROUTES ---------------- #

@app.get("/")
async def root():
    return {"message": "IR Parser API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ir-parser-api"}

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        try:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

            print(f"📄 Received file: {file.filename}")

            # Step 1: Extract text
            extracted_text = extract_text_from_pdf(temp_file.name)
            print("🔍 Text extracted. Generating summary...")

            # Step 2: Get structured JSON summary
            summary_json = get_structured_summary(extracted_text)

            # Step 3: Clean and parse JSON (remove Markdown fences if any)
            if summary_json.startswith("```json"):
                summary_json = summary_json.split("```json")[1].split("```")[0]
            elif summary_json.startswith("```"):
                summary_json = summary_json.split("```")[1].split("```")[0]

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
            print("❌ JSON decode error:", e)
            raise HTTPException(status_code=500, detail=f"Invalid JSON: {str(e)}")

        except Exception as e:
            print("❌ PDF processing error:", e)
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

        finally:
            try:
                os.unlink(temp_file.name)
            except:
                pass

# ---------------- EXCEPTION HANDLER ---------------- #

@app.exception_handler(Exception)
async def handle_all_exceptions(request, exc):
    print(f"🔥 Uncaught error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)},
    )

# ---------------- MAIN ENTRY POINT ---------------- #

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"🚀 Starting server at http://{host}:{port}")
    print("ℹ️  Make sure your .env contains the correct OPENAI_API_KEY and ALLOWED_ORIGINS")
    uvicorn.run("server:app", host=host, port=port, reload=True)
