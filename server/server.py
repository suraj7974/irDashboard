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
questions_dir = Path(__file__).parent / "questions"
sys.path.append(str(parser_dir))
sys.path.append(str(questions_dir))

# Optional: Dummy fallback if parser module fails
try:
    from parser.main import extract_text_from_pdf, get_structured_summary
    print("✅ Using main.py with chunking support")
except ImportError:
    print("⚠️ Falling back to dummy summary function (parser.main not found)")

    def extract_text_from_pdf(path):
        with open(path, "rb") as f:
            return f.read().decode(errors="ignore")

    def get_structured_summary(text):
        # Return a static test JSON string
        return json.dumps(
            {
                "summary": "This is a test summary.",
                "sections": ["Section 1", "Section 2"],
            }
        )

# Questions processor removed - using manual entry instead
print("✅ Using manual question entry (AI processing disabled)")
QUESTIONS_AVAILABLE = False


# Initialize FastAPI app
app = FastAPI(title="IR Parser API", description="API for processing IR PDF documents")

# CORS allowed origins
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://ir-dashboard.vercel.app",
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


@app.post("/chatbot/query")
async def chatbot_query(request: dict):
    """
    Handle chatbot queries with intelligent search and conversation context
    """
    try:
        query = request.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

        print(f"🤖 Chatbot query: {query}")

        # Import the chatbot service functions
        from chatbot_service import process_improved_chatbot_query
        
        # Get session ID from request
        session_id = request.get("sessionId")
        
        # Process the query with improved search and context
        response_data = await process_improved_chatbot_query(query, session_id)
        
        return JSONResponse(content=response_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Chatbot error: {e}")
        # Fallback response
        response_data = {
            "success": True,
            "response": f"I received your query: '{query}'. I'm searching through the reports but encountered an issue. Please try rephrasing your question.",
            "sources": [],
            "intent": {
                "intent_type": "general",
                "entities": {},
                "confidence": 0.5,
                "originalQuery": query
            },
            "followUpSuggestions": [],
            "sessionId": session_id
        }
        return JSONResponse(content=response_data)


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

        # Questions analysis removed - using manual entry instead
        # Create empty questions structure for UI compatibility
        questions_analysis = {
            "success": True,
            "processing_time_seconds": 0,
            "summary": {
                "total_questions": 60,
                "questions_found": 0,
                "success_rate": 0
            },
            "results": []
        }
        
        # Initialize all 60 questions with empty answers for manual entry
        standard_questions = []
        try:
            questions_file_path = os.path.join("questions", "questions.txt")
            if os.path.exists(questions_file_path):
                with open(questions_file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Extract questions from the file
                    lines = content.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and (line[0].isdigit() or line.startswith('(')):
                            standard_questions.append(line)
        except Exception as e:
            print(f"⚠️ Could not load questions file: {e}")
            
        # Create empty results for all questions
        for i, question in enumerate(standard_questions[:60]):  # Limit to 60 questions
            questions_analysis["results"].append({
                "question": question,
                "standard_question": question,
                "answer": "",
                "found": False,
                "confidence": 0.0,
                "question_number": i + 1
            })
            
        print(f"✅ Initialized {len(questions_analysis['results'])} questions for manual entry")

        response_data = {
            "success": True,
            "filename": file.filename,
            "data": parsed_data,
            "raw_text_length": len(extracted_text),
            "questions_analysis": questions_analysis
        }

        return JSONResponse(content=response_data)

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
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Starting server at http://{host}:{port}")
    print(
        "ℹ️  Make sure your .env contains the correct GEMINI_API_KEY and ALLOWED_ORIGINS"
    )
    uvicorn.run("server:app", host=host, port=port, reload=True)
