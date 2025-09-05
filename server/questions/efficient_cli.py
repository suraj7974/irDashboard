#!/usr/bin/env python3
"""
Efficient PDF Question-Answer CLI Tool
Processes questions one by one for optimal quota usage
"""

import argparse
import json
import os
from efficient_llm_processor import EfficientLLMProcessor


def main():
    parser = argparse.ArgumentParser(
        description="Efficient PDF Question-Answer Processor with Batch Processing"
    )
    parser.add_argument("pdf_file", help="Path to PDF file")
    parser.add_argument(
        "--questions",
        default="questions_clean.txt",
        help="Path to questions file (default: questions_clean.txt)",
    )
    parser.add_argument(
        "--output", help="Output JSON file (auto-generated if not specified)"
    )
    parser.add_argument(
        "--api-key", help="Gemini API key (can also use GEMINI_API_KEY env var)"
    )
    parser.add_argument(
        "--batch-size", 
        type=int, 
        default=10, 
        help="Number of questions per batch request (default: 10)"
    )

    args = parser.parse_args()

    # Validate files
    if not os.path.exists(args.pdf_file):
        print(f"❌ PDF file not found: {args.pdf_file}")
        return 1

    if not os.path.exists(args.questions):
        print(f"❌ Questions file not found: {args.questions}")
        return 1

    try:
        # Initialize processor with batch processing
        processor = EfficientLLMProcessor(api_key=args.api_key, batch_size=args.batch_size)

        # Process PDF
        print(f"📄 Processing: {args.pdf_file}")
        print(f"❓ Questions: {args.questions}")
        print(f"📦 Batch Size: {args.batch_size} questions per request")
        print("=" * 50)

        results = processor.process_pdf_efficiently(args.pdf_file, args.questions)

        if results.get("success"):
            # Save results
            output_file = processor.save_results(results, args.output)

            # Show first few matches for verification
            matches = [r for r in results["results"] if r["found_question"]]
            if matches:
                print("\n🎯 Sample Matches:")
                for i, match in enumerate(matches[:3]):
                    print(f"  Q{i+1}: {match['standard_question'][:60]}...")
                    print(f"      Answer: {match['answer'][:80]}...")
                    print()

            return 0
        else:
            print(f"❌ Processing failed: {results.get('error')}")
            return 1

    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
