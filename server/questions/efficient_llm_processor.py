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
    Efficient LLM processor that processes multiple questions in batches to minimize API calls
    """

    def __init__(self, api_key: str = None, batch_size: int = 6):
        """Initialize the processor with batch processing"""

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

        # Batch processing settings
        self.batch_size = batch_size
        self.request_delay = 2.0  # 2 seconds between batch requests

        print(f"✅ Efficient LLM Processor initialized with batch size: {batch_size}")
        print(
            f"⏱️  Processing ~{60//batch_size} batches instead of 60 individual requests"
        )

    def _wait_between_batches(self):
        """Wait between batch requests to avoid overwhelming the API"""
        print(f"⏳ Waiting {self.request_delay}s between batches...")
        time.sleep(self.request_delay)

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

    def process_questions_batch(
        self, questions_batch: List[str], pdf_content: str, batch_index: int
    ) -> List[Dict]:
        """Process a batch of questions in a single API request"""

        # Create comprehensive prompt for batch processing
        questions_list = "\n".join(
            [f"{i+1}. {q}" for i, q in enumerate(questions_batch)]
        )

        # Calculate actual question numbers for this batch (for table formatting)
        start_question_num = batch_index * self.batch_size + 1
        table_questions_in_batch = []
        for i, _ in enumerate(questions_batch):
            actual_question_num = start_question_num + i
            if 28 <= actual_question_num <= 40:
                table_questions_in_batch.append(i + 1)  # 1-based index for this batch

        # Add table formatting instructions if needed
        table_instructions = ""
        if table_questions_in_batch:
            table_questions_str = ", ".join(map(str, table_questions_in_batch))
            table_instructions = f"""

SPECIAL TABULAR FORMATTING:
- For questions {table_questions_str} in this batch: Return answers in tabular format
- Use pipe separators: Column1 | Column2 | Column3 | Column4
- Each row on a new line
- Handle both English and Hindi text properly
- Examples:
  * Hindi: "नाम | संख्या | वर्ष | स्थान\\nराम शर्मा | 5 | 2020 | गाँव अ\\nश्याम गुप्ता | 3 | 2021 | गाँव ब"
- Include ALL data found, even if tables are very long (10+ rows)
- Do not truncate or summarize table data
- Maintain consistent column structure across all rows"""

        prompt = f"""
Analyze the document and find answers for these questions. For each question, determine if it exists in the document and extract the answer.

QUESTIONS TO ANALYZE:
{questions_list}

DOCUMENT CONTENT:
{pdf_content}

For each question, respond with a JSON array where each object has:
{{
    "question_number": number (1-{len(questions_batch)}),
    "standard_question": "original question text",
    "question_found": true/false,
    "pdf_question_text": "exact text found in document" or "",
    "answer_text": "complete answer extracted" or ""
}}

Return ONLY a JSON array with {len(questions_batch)} objects, one for each question in order.

Rules:
- Match questions that are very similar in meaning
- Extract complete answers that follow the questions
- If no match found, set question_found to false and leave answer_text empty
- Be thorough but concise in answers{table_instructions}
"""

        try:
            print(
                f"🔄 Processing batch {batch_index + 1} ({len(questions_batch)} questions)..."
            )
            print(f"📄 Document content length: {len(pdf_content):,} characters")
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Extract JSON array
            json_match = re.search(r"\[.*\]", result_text, re.DOTALL)
            if json_match:
                batch_results = json.loads(json_match.group())

                # Convert to our format
                formatted_results = []
                for i, result in enumerate(batch_results):
                    if i < len(questions_batch):  # Safety check
                        formatted_results.append(
                            {
                                "standard_question": questions_batch[i],
                                "found_question": (
                                    result.get("pdf_question_text", "")
                                    if result.get("question_found")
                                    else ""
                                ),
                                "answer": (
                                    result.get("answer_text", "")
                                    if result.get("question_found")
                                    else ""
                                ),
                            }
                        )

                return formatted_results
            else:
                print(f"❌ Could not parse JSON from batch {batch_index + 1}")

        except Exception as e:
            error_msg = str(e).lower()
            print(f"❌ Error processing batch {batch_index + 1}: {e}")

            # Handle specific errors
            if "quota" in error_msg or "rate limit" in error_msg:
                print(f"⚠️  API quota/rate limit detected, waiting longer...")
                time.sleep(10)
            elif "token" in error_msg or "context" in error_msg:
                print(
                    f"⚠️  Token limit exceeded for this document. Document may be too large."
                )
                print(f"📄 Document length: {len(pdf_content):,} characters")
                time.sleep(3)
            else:
                time.sleep(3)

        # Return empty results for failed batch
        return [
            {"standard_question": q, "found_question": "", "answer": ""}
            for q in questions_batch
        ]

    def process_pdf_efficiently(self, pdf_path: str, question_file: str) -> Dict:
        """Process PDF efficiently using batch processing to minimize API calls"""

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
        num_batches = (
            total_questions + self.batch_size - 1
        ) // self.batch_size  # Ceiling division

        print(f"📊 Processing {total_questions} questions in {num_batches} batches")
        print(f"📦 Batch size: {self.batch_size} questions per request")
        print(f"⏱️  Estimated time: ~{num_batches * self.request_delay:.0f} seconds")

        # Process questions in batches
        all_results = []
        successful_matches = 0

        for batch_idx in range(num_batches):
            start_idx = batch_idx * self.batch_size
            end_idx = min(start_idx + self.batch_size, total_questions)
            batch_questions = questions[start_idx:end_idx]

            progress_percent = ((batch_idx + 1) / num_batches) * 100
            print(
                f"� Batch {batch_idx + 1}/{num_batches} ({progress_percent:.1f}%) - Questions {start_idx + 1}-{end_idx}"
            )

            # Process this batch
            batch_results = self.process_questions_batch(
                batch_questions, pdf_content, batch_idx
            )
            all_results.extend(batch_results)

            # Count successful matches in this batch
            batch_matches = sum(1 for r in batch_results if r["found_question"])
            successful_matches += batch_matches

            print(
                f"  ✅ Batch completed: {batch_matches}/{len(batch_questions)} questions found"
            )

            # Wait between batches (except for the last one)
            if batch_idx < num_batches - 1:
                self._wait_between_batches()

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
                "batch_info": {
                    "batch_size": self.batch_size,
                    "total_batches": num_batches,
                    "api_requests_made": num_batches,
                    "requests_saved": total_questions - num_batches,
                },
            },
            "results": all_results,
        }

        print(
            f"✅ Completed in {processing_time:.1f} seconds ({processing_time/60:.1f} minutes)"
        )
        print(
            f"📊 Results: {successful_matches}/{len(questions)} questions found ({final_results['summary']['success_rate']:.1f}%)"
        )
        print(
            f"🎯 Efficiency: Used {num_batches} API requests instead of {total_questions} (saved {total_questions - num_batches} requests!)"
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
