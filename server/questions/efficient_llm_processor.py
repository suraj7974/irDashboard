"""
Efficient LLM PDF Question-Answer Processor
Optimized for speed and quota management
"""

import os
import re
import json
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
    Efficient LLM processor that processes questions one by one
    """

    def __init__(self, api_key: str = None):
        """Initialize the processor"""

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

        print("✅ Efficient LLM Processor initialized")

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
        """Find a specific question in PDF and extract its answer immediately"""

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
            print(f"Error processing Q{question_index + 1}: {e}")

        # Return empty result on failure
        return {
            "standard_question": standard_question,
            "found_question": "",
            "answer": ""
        }

    def process_pdf_efficiently(self, pdf_path: str, question_file: str) -> Dict:
        """Process PDF efficiently - one question at a time"""

        start_time = datetime.now()

        # Load questions
        questions = self.load_questions(question_file)
        if not questions:
            return {"error": "No questions loaded"}

        # Extract PDF content once
        pdf_content = self.extract_simple_pdf_content(pdf_path)
        if not pdf_content:
            return {"error": "No content extracted from PDF"}

        print(f"Processing {len(questions)} questions...")

        # Process questions one by one
        results = []
        successful_matches = 0

        for i, question in enumerate(questions):
            print(f"Q{i+1}/{len(questions)}: Processing...")

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
            },
            "results": results,
        }

        print(
            f"✅ Completed: {successful_matches}/{len(questions)} questions found ({final_results['summary']['success_rate']:.1f}%)"
        )

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
