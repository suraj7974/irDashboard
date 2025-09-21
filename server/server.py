from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parser directory to Python path
parser_dir = Path(__file__).parent / "parser"
sys.path.append(str(parser_dir))

# Import your existing parser functions
try:
    from parser.main import extract_text_from_pdf, get_structured_summary
except ImportError:
    print(
        "Error: Could not import parser functions. Make sure the parser directory is set up correctly."
    )
    sys.exit(1)

app = FastAPI(title="IR Parser API", description="API for processing IR PDF documents")

# Get allowed origins from environment variable
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000",
).split(",")

# Configure CORS to allow requests from React app
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
    """
    Process an uploaded PDF file and return structured JSON data
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        try:
            # Write uploaded file to temp location
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

            # Extract text using your existing function
            print(f"Processing file: {file.filename}")
            extracted_text = extract_text_from_pdf(temp_file.name)

            # Get structured summary using your existing function
            print("Getting structured summary...")
            summary_json = get_structured_summary(extracted_text)

            # Parse the JSON response
            try:
                # Remove any markdown formatting if present
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
                print(f"JSON parse error: {e}")
                print(f"Raw summary: {summary_json}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to parse AI response as JSON: {str(e)}",
                )

        except Exception as e:
            print(f"Processing error: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to process PDF: {str(e)}"
            )

        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file.name)
            except:
                pass


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"Global exception: {exc}")
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

    # Get configuration from environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print("Starting IR Parser API server...")
    print(f"Server will run on {host}:{port}")
    print("Make sure you have set your OpenAI API key in the .env file")
    uvicorn.run("server:app", host=host, port=port, reload=True)
