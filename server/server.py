from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add the parser directory to the Python path
parser_dir = Path(__file__).parent / "parser"
sys.path.append(str(parser_dir))

# Optional: Dummy fallback if parser module fails
try:
    from parser.main import extract_text_from_pdf, get_structured_summary
except ImportError:
    print("⚠️ Falling back to dummy summary function (parser.main not found)")

    def extract_text_from_pdf(path):
        with open(path, "rb") as f:
            return f.read().decode(errors="ignore")

    def get_structured_summary(text):
        # Return a static test JSON string
        return json.dumps({
            "summary": "This is a test summary.",
            "sections": ["Section 1", "Section 2"]
        })

# Initialize FastAPI app
app = FastAPI(
    title="IR Parser API",
    description="API for processing IR PDF documents"
)

# CORS allowed origins
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://ir-dashboard.vercel.app"
).split(",")

print("✅ Allowed CORS Origins:", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "IR Parser API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ir-parser-api"}

@app.head("/")
async def root_head():
    return

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    print(f"📝 Received file: {file.filename}")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        content = await file.read()
        print(f"📦 File size: {len(content)} bytes")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(content)
            temp_file.flush()
            temp_path = temp_file.name
            print(f"📂 Saved file to {temp_path}")

        extracted_text = extract_text_from_pdf(temp_path)
        print(f"📜 Extracted {len(extracted_text)} characters from PDF")

        summary_json = get_structured_summary(extracted_text)
        print(f"🧠 Raw summary (first 100 chars): {summary_json[:100]}...")

        # Remove markdown formatting if present
        if summary_json.startswith("```json"):
            summary_json = summary_json.split("```json")[1].split("```")[0]
        elif summary_json.startswith("```"):
            summary_json = summary_json.split("```")[1].split("```")[0]

        parsed_data = json.loads(summary_json)

        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "data": parsed_data,
            "raw_text_length": len(extracted_text)
        })

    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse summary JSON.")
    except Exception as e:
        print(f"❌ Error during PDF processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        try:
            os.unlink(temp_path)
        except Exception as e:
            print(f"⚠️ Could not delete temp file: {e}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"❌ Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)},
    )

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Starting server at http://{host}:{port}")
    print("ℹ️  Make sure your .env contains the correct OPENAI_API_KEY and ALLOWED_ORIGINS")
    uvicorn.run("server:app", host=host, port=port, reload=True)
