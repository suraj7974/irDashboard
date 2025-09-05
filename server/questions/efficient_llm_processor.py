"""
Efficient LLM PDF Question-Answer Processor
Optimized for speed and quota management with rate limiting
"""

import os
import re
import json
import time
from typing import List, Dict
from datetime import datetime

# LLM imports
try:
    import google.generativeai as genai
except ImportError:
    print("❌ Please install google-generativeai: pip install google-generativeai")


# Load .env file support
def load_env_file(env_path: str = ".env"):
    """Load environment variables from .env file"""
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    value = value.strip().strip('"').strip("'")
                    os.environ[key.strip()] = value


# Load .env file automatically
load_env_file()

# PDF processing imports
import pdfplumber
from .kru_uni_smart import ExactKrutiDevConverter


class EfficientLLMProcessor:
    """
    Efficient LLM processor that processes questions one by one with rate limiting
    """

    def __init__(self, api_key: str = None, requests_per_minute: int = 15):
        """Initialize the processor with rate limiting"""

        # Set up Gemini API
        if api_key:
            genai.configure(api_key=api_key)
        elif os.getenv("GEMINI_API_KEY"):
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        else:
            raise ValueError("Please provide Gemini API key")

        # Use only one efficient model
        self.model = genai.GenerativeModel("gemini-1.5-flash")

        # Initialize converter
        self.converter = ExactKrutiDevConverter()

        # Rate limiting settings
        self.requests_per_minute = requests_per_minute
        self.request_interval = 60.0 / requests_per_minute  # seconds between requests
        self.last_request_time = 0

        print(f"✅ Efficient LLM Processor initialized with {requests_per_minute} RPM rate limit")
        print(f"⏱️  Request interval: {self.request_interval:.2f} seconds")

    def _wait_for_rate_limit(self):
        """Wait if necessary to respect rate limits"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.request_interval:
            wait_time = self.request_interval - time_since_last_request
            print(f"⏳ Rate limiting: waiting {wait_time:.1f}s...")
            time.sleep(wait_time)
        
        self.last_request_time = time.time()

    def load_questions(self, question_file: str) -> List[str]:
        """Load questions from file"""
        if not os.path.exists(question_file):
            return []

        with open(question_file, "r", encoding="utf-8") as f:
            questions = [line.strip() for line in f.readlines() if line.strip()]

        return questions

    def extract_simple_pdf_content(self, pdf_path: str) -> str:
        """Extract simple text content from PDF without table processing"""

        all_text = ""

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Simple text extraction
                page_text = page.extract_text()
                if page_text:
                    # Convert KrutiDev to Unicode
                    unicode_text = self.converter.convert_text(page_text)
                    all_text += unicode_text + "\n"

        return all_text

    def find_and_answer_question(
        self, standard_question: str, pdf_content: str, question_index: int
    ) -> Dict:
        """Find a specific question in PDF and extract its answer immediately with rate limiting"""

        # Apply rate limiting
        self._wait_for_rate_limit()

        # Create efficient prompt for both matching and answering
        prompt = f"""
Find this exact question in the document and extract its answer:

Target Question: "{standard_question}"

Document Content:
{pdf_content[:8000]}  

Tasks:
1. Find the question that matches the target question (must be very similar)
2. If found, extract the complete answer that follows the question
3. Respond with only this JSON:

{{
    "question_found": true/false,
    "pdf_question_number": number or null,
    "pdf_question_text": "exact text found" or "",
    "answer_text": "complete answer" or "",
}}

Rules:
- Only match if questions are almost identical
- Extract the complete answer text that follows the question
- Be concise but complete
"""

        try:
            print(f"🔄 API Request {question_index + 1}/60...")
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Extract JSON
            json_match = re.search(r"\{.*\}", result_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())

                # Return only the three fields you want
                if result.get("question_found"):
                    return {
                        "standard_question": standard_question,
                        "found_question": result.get("pdf_question_text", ""),
                        "answer": result.get("answer_text", "")
                    }
                else:
                    return {
                        "standard_question": standard_question,
                        "found_question": "",
                        "answer": ""
                    }

        except Exception as e:
            error_msg = str(e).lower()
            print(f"❌ Error processing Q{question_index + 1}: {e}")
            
            # Handle specific rate limiting errors
            if 'quota' in error_msg or 'rate limit' in error_msg or 'too many requests' in error_msg:
                print(f"⚠️  Rate limit detected, waiting extra time...")
                time.sleep(5)  # Wait 5 seconds on rate limit error
            else:
                time.sleep(2)  # Wait 2 seconds on other errors

        # Return empty result on failure
        return {
            "standard_question": standard_question,
            "found_question": "",
            "answer": ""
        }

    def process_pdf_efficiently(self, pdf_path: str, question_file: str) -> Dict:
        """Process PDF efficiently - one question at a time with rate limiting"""

        start_time = datetime.now()

        # Load questions
        questions = self.load_questions(question_file)
        if not questions:
            return {"error": "No questions loaded"}

        # Extract PDF content once
        pdf_content = self.extract_simple_pdf_content(pdf_path)
        if not pdf_content:
            return {"error": "No content extracted from PDF"}

        total_questions = len(questions)
        estimated_time_minutes = (total_questions * self.request_interval) / 60
        
        print(f"📊 Processing {total_questions} questions with rate limiting...")
        print(f"⏱️  Estimated completion time: {estimated_time_minutes:.1f} minutes")
        print(f"🔄 Rate limit: {self.requests_per_minute} requests/minute ({self.request_interval:.1f}s interval)")

        # Process questions one by one
        results = []
        successful_matches = 0

        for i, question in enumerate(questions):
            progress_percent = ((i + 1) / total_questions) * 100
            elapsed_time = (datetime.now() - start_time).total_seconds()
            
            print(f"📋 Q{i+1}/{total_questions} ({progress_percent:.1f}%) - Elapsed: {elapsed_time:.1f}s")

            result = self.find_and_answer_question(question, pdf_content, i)
            results.append(result)

            if result["found_question"]:  # Check if found_question is not empty
                successful_matches += 1
                print(f"  ✅ Found & answered")
            else:
                print(f"  ❌ Not found")

        # Compile results
        processing_time = (datetime.now() - start_time).total_seconds()

        final_results = {
            "success": True,
            "processing_time_seconds": processing_time,
            "summary": {
                "total_questions": len(questions),
                "questions_found": successful_matches,
                "success_rate": (
                    (successful_matches / len(questions)) * 100 if questions else 0
                ),
                "rate_limit_info": {
                    "requests_per_minute": self.requests_per_minute,
                    "request_interval_seconds": self.request_interval,
                    "actual_processing_minutes": processing_time / 60
                }
            },
            "results": results,
        }

        print(f"✅ Completed in {processing_time/60:.1f} minutes")
        print(f"📊 Results: {successful_matches}/{len(questions)} questions found ({final_results['summary']['success_rate']:.1f}%)")

        return final_results

    def save_results(self, results: Dict, output_file: str = None) -> str:
        """Save results to JSON file"""

        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"efficient_results_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        return output_file


def main():
    """Example usage"""

    processor = EfficientLLMProcessor()

    # Process PDF efficiently
    results = processor.process_pdf_efficiently("test.pdf", "questions_clean.txt")

    if results.get("success"):
        output_file = processor.save_results(results)
        print(f"Results saved to: {output_file}")
    else:
        print(f"Processing failed: {results.get('error')}")


if __name__ == "__main__":
    main()
