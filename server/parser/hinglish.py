import os
import pytesseract
from PIL import Image
import pdf2image
from openai import OpenAI
from dotenv import load_dotenv
import re
import time
import json
from datetime import datetime
import glob

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class HindiPDFTranslator:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Krutidev to Unicode mapping (basic characters)
        self.krutidev_to_unicode = {
            "k": "क",
            "x": "ख",
            "x": "ग",
            "l": "घ",
            "p": "ङ",
            "p": "च",
            "N": "छ",
            "t": "ज",
            "T": "झ",
            "\\": "ञ",
            "V": "ट",
            "B": "ठ",
            "M": "ड",
            "<": "ढ",
            ".": "ण",
            "r": "त",
            "F": "थ",
            "n": "द",
            "o": "ध",
            "u": "न",
            "i": "प",
            "Q": "फ",
            "c": "ब",
            "H": "भ",
            "e": "म",
            ";": "य",
            "j": "र",
            "y": "ल",
            "Y": "व",
            "k": "श",
            "l": "ष",
            "l": "स",
            "g": "ह",
            "K": "क्ष",
            "G": "त्र",
            "K": "ज्ञ",
            "v": "अ",
            "b": "आ",
            "f": "इ",
            "h": "ई",
            "o": "उ",
            "p": "ऊ",
            "I": "ए",
            "J": "ऐ",
            "h": "ओ",
            "k": "औ",
            "q": "ं",
            "W": "ः",
            "1": "१",
            "2": "२",
            "3": "३",
            "4": "४",
            "5": "५",
            "6": "६",
            "7": "७",
            "8": "८",
            "9": "९",
            "0": "०",
        }

    def extract_text_from_pdf_page(self, pdf_path, page_num=1):
        """Extract text from specific page of PDF using OCR"""
        try:
            # Convert PDF page to image
            pages = pdf2image.convert_from_path(
                pdf_path, first_page=page_num, last_page=page_num
            )
            if not pages:
                return None

            # Use Tesseract OCR with Hindi language
            extracted_text = pytesseract.image_to_string(pages[0], lang="hin+eng")
            return extracted_text.strip()

        except Exception as e:
            print(f"Error extracting text from page {page_num}: {e}")
            return None

    def get_total_pages(self, pdf_path):
        """Get total number of pages in PDF"""
        try:
            pages = pdf2image.convert_from_path(pdf_path, first_page=1, last_page=1)
            # Use pdfinfo or alternative method to get page count
            import subprocess

            result = subprocess.run(
                ["pdfinfo", pdf_path], capture_output=True, text=True
            )
            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if "Pages:" in line:
                        return int(line.split(":")[1].strip())

            # Fallback: try converting all pages to count them
            all_pages = pdf2image.convert_from_path(pdf_path)
            return len(all_pages)

        except Exception as e:
            print(f"Error getting page count: {e}")
            # Try converting first few pages to estimate
            try:
                test_pages = pdf2image.convert_from_path(
                    pdf_path, first_page=1, last_page=10
                )
                print(
                    f"⚠️  Could not determine exact page count. Found at least {len(test_pages)} pages."
                )
                return len(test_pages)
            except:
                return 1

    def krutidev_to_unicode_convert(self, text):
        """Convert Krutidev text to Unicode Hindi"""
        unicode_text = text
        for krutidev_char, unicode_char in self.krutidev_to_unicode.items():
            unicode_text = unicode_text.replace(krutidev_char, unicode_char)
        return unicode_text

    def hindi_to_hinglish(self, text):
        """Convert Hindi to Hinglish using OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Convert the given Hindi text to Hinglish (Hindi written in Roman/English alphabets). Maintain the meaning and context.",
                    },
                    {
                        "role": "user",
                        "content": f"Convert this Hindi text to Hinglish: {text}",
                    },
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error in Hindi to Hinglish conversion: {e}")
            return None

    def hindi_to_english(self, text):
        """Translate Hindi to English using OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Translate the given Hindi text to English. Provide accurate and natural translation.",
                    },
                    {
                        "role": "user",
                        "content": f"Translate this Hindi text to English: {text}",
                    },
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error in Hindi to English translation: {e}")
            return None

    def save_results_to_json(
        self,
        original_lines,
        hinglish_lines,
        english_lines,
        pdf_path,
        page_num,
        is_whole_pdf=False,
    ):
        """Save results to JSON file with line-by-line format"""
        # Create structured data with metadata
        results = {
            "metadata": {
                "pdf_file": os.path.basename(pdf_path),
                "page_number": page_num if not is_whole_pdf else "all_pages",
                "extraction_date": datetime.now().isoformat(),
                "total_lines": len(original_lines),
                "total_characters": sum(len(line) for line in original_lines),
            },
            "lines": {},
        }

        # Determine maximum number of lines to iterate
        max_lines = max(len(original_lines), len(hinglish_lines), len(english_lines))

        # Create line-by-line structure
        for i in range(max_lines):
            line_key = f"line_{i+1}"
            results["lines"][line_key] = {
                "original_hindi_text": (
                    original_lines[i] if i < len(original_lines) else ""
                ),
                "hindi_translation": (
                    original_lines[i] if i < len(original_lines) else ""
                ),
                "hinglish_translation": (
                    hinglish_lines[i] if i < len(hinglish_lines) else ""
                ),
                "english_translation": (
                    english_lines[i] if i < len(english_lines) else ""
                ),
            }

        # Generate filename
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if is_whole_pdf:
            json_filename = f"{base_name}_complete_pdf_translations_{timestamp}.json"
        else:
            json_filename = f"{base_name}_page{page_num}_translations_{timestamp}.json"

        # Save to JSON file
        try:
            with open(json_filename, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            print(f"✅ Results saved to: {json_filename}")
            return json_filename

        except Exception as e:
            print(f"❌ Error saving JSON file: {e}")
            return None

    def translate_line_by_line(self, lines):
        """Translate each line individually to maintain alignment"""
        hinglish_lines = []
        english_lines = []

        for i, line in enumerate(lines):
            if not line.strip():
                hinglish_lines.append("")
                english_lines.append("")
                continue

            print(f"🔄 Translating line {i+1}/{len(lines)}: {line[:50]}...")

            # Translate to Hinglish
            hinglish = self.hindi_to_hinglish(line)
            hinglish_lines.append(hinglish if hinglish else "")

            # Translate to English
            english = self.hindi_to_english(line)
            english_lines.append(english if english else "")

            # Small delay to avoid rate limiting
            time.sleep(0.5)

        return hinglish_lines, english_lines

    def highlight_text(self, text, search_term):
        """Highlight search term in text using ANSI color codes"""
        if not search_term.strip():
            return text

        # Create case-insensitive pattern
        pattern = re.compile(re.escape(search_term), re.IGNORECASE)

        # ANSI color codes for highlighting
        HIGHLIGHT = "\033[43m\033[30m"  # Yellow background, black text
        RESET = "\033[0m"  # Reset to normal

        # Replace matches with highlighted version
        highlighted = pattern.sub(f"{HIGHLIGHT}{search_term.upper()}{RESET}", text)
        return highlighted

    def find_column_position(self, text, search_term):
        """Find all column positions of search term in text"""
        positions = []
        text_lower = text.lower()
        search_lower = search_term.lower()
        start = 0

        while True:
            pos = text_lower.find(search_lower, start)
            if pos == -1:
                break
            positions.append(pos + 1)  # 1-based indexing
            start = pos + 1

        return positions

    def search_in_json(self, json_file_path, search_term):
        """Search for term in JSON file and display results with highlighting"""
        try:
            with open(json_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            print(
                f"\n🔍 SEARCH RESULTS for '{search_term}' in {os.path.basename(json_file_path)}"
            )
            print("=" * 80)

            found_matches = 0
            lines_data = data.get("lines", {})

            for line_key, line_data in lines_data.items():
                line_num = line_key.replace("line_", "")
                page_num = "Unknown"

                # Extract page number from line content if it's a page separator
                original_text = line_data.get("original_hindi_text", "")
                if original_text.startswith("=== PAGE ") and original_text.endswith(
                    " ==="
                ):
                    page_match = re.search(r"=== PAGE (\d+) ===", original_text)
                    if page_match:
                        page_num = page_match.group(1)
                    continue  # Skip page separators in search

                # Search in all text fields
                fields_to_search = {
                    "Hindi": line_data.get("original_hindi_text", ""),
                    "Hinglish": line_data.get("hinglish_translation", ""),
                    "English": line_data.get("english_translation", ""),
                }

                line_has_match = False

                for field_name, field_text in fields_to_search.items():
                    if not field_text:
                        continue

                    # Check if search term exists (case-insensitive)
                    if search_term.lower() in field_text.lower():
                        if not line_has_match:
                            print(f"\n📍 Line {line_num} | Page {page_num}")
                            print("-" * 40)
                            line_has_match = True
                            found_matches += 1

                        # Find column positions
                        col_positions = self.find_column_position(
                            field_text, search_term
                        )

                        # Display with highlighting
                        highlighted_text = self.highlight_text(field_text, search_term)
                        print(
                            f"{field_name:10} | Col {', '.join(map(str, col_positions)):15} | {highlighted_text}"
                        )

            print("\n" + "=" * 80)
            if found_matches > 0:
                print(f"✅ Found '{search_term}' in {found_matches} lines")
            else:
                print(f"❌ No matches found for '{search_term}'")
            print("=" * 80)

            return found_matches > 0

        except FileNotFoundError:
            print(f"❌ JSON file not found: {json_file_path}")
            return False
        except Exception as e:
            print(f"❌ Error searching JSON file: {e}")
            return False

    def list_json_files(self):
        """List all JSON translation files in current directory"""
        json_files = glob.glob("*_translations_*.json")
        if not json_files:
            print("❌ No translation JSON files found in current directory")
            return []

        print("\n📁 Available JSON translation files:")
        for i, filename in enumerate(json_files, 1):
            print(f"{i}. {filename}")

        return json_files

    def search_interface(self):
        """Interactive search interface"""
        print("\n🔍 SEARCH IN TRANSLATED FILES")
        print("=" * 50)

        # List available JSON files
        json_files = self.list_json_files()
        if not json_files:
            return

        # Let user select file
        while True:
            try:
                choice = input(
                    f"\nSelect file (1-{len(json_files)}) or enter filename: "
                ).strip()

                if choice.isdigit():
                    file_index = int(choice) - 1
                    if 0 <= file_index < len(json_files):
                        selected_file = json_files[file_index]
                        break
                    else:
                        print(f"❌ Please enter number between 1 and {len(json_files)}")
                elif choice.endswith(".json") and os.path.exists(choice):
                    selected_file = choice
                    break
                else:
                    print("❌ Invalid selection or file not found")
            except ValueError:
                print("❌ Please enter a valid number or filename")

        print(f"\n📂 Selected file: {selected_file}")

        # Search loop
        while True:
            search_term = input("\n🔍 Enter search term (or 'quit' to exit): ").strip()

            if search_term.lower() in ["quit", "exit", "q"]:
                print("👋 Exiting search...")
                break

            if not search_term:
                print("❌ Please enter a search term")
                continue

            # Perform search
            self.search_in_json(selected_file, search_term)

    def process_whole_pdf(self, pdf_path):
        """Process entire PDF - all pages (simplified without cost confirmation)"""
        print(f"🔍 Analyzing PDF: {pdf_path}")

        # Get total pages
        total_pages = self.get_total_pages(pdf_path)
        print(f"📄 Found {total_pages} pages in PDF")

        print(f"\n🚀 Starting processing of all {total_pages} pages...")
        print("=" * 60)

        all_original_lines = []
        all_hinglish_lines = []
        all_english_lines = []

        for page_num in range(1, total_pages + 1):
            print(f"\n📄 PROCESSING PAGE {page_num}/{total_pages}")
            print("-" * 40)

            # Extract text from current page
            print(f"🔍 Extracting text from page {page_num}...")
            raw_text = self.extract_text_from_pdf_page(pdf_path, page_num)

            if not raw_text:
                print(f"⚠️  No text found on page {page_num}, skipping...")
                continue

            print(f"✅ Extracted {len(raw_text)} characters from page {page_num}")

            # Convert Krutidev to Unicode
            unicode_text = self.krutidev_to_unicode_convert(raw_text)

            # Split into lines
            page_lines = [
                line.strip() for line in unicode_text.split("\n") if line.strip()
            ]
            print(f"📝 Found {len(page_lines)} lines on page {page_num}")

            if not page_lines:
                print(f"⚠️  No lines to translate on page {page_num}")
                continue

            # Add page separator in combined results
            all_original_lines.append(f"=== PAGE {page_num} ===")
            all_hinglish_lines.append(f"=== PAGE {page_num} ===")
            all_english_lines.append(f"=== PAGE {page_num} ===")

            # Translate page lines
            page_hinglish, page_english = self.translate_line_by_line(page_lines)

            # Add to combined results
            all_original_lines.extend(page_lines)
            all_hinglish_lines.extend(page_hinglish)
            all_english_lines.extend(page_english)

            print(f"✅ Page {page_num} completed!")

            # Small break between pages
            if page_num < total_pages:
                print("⏳ Taking a short break...")
                time.sleep(2)

        # Save combined results
        print(f"\n🎯 PROCESSING COMPLETE!")
        print("=" * 60)
        print(
            f"📊 Total lines processed: {len([l for l in all_original_lines if not l.startswith('===')])} lines"
        )

        # Save to JSON
        json_file = self.save_results_to_json(
            all_original_lines,
            all_hinglish_lines,
            all_english_lines,
            pdf_path,
            None,
            is_whole_pdf=True,
        )

        if json_file:
            print(f"📁 Complete PDF results saved: {json_file}")
            print("🎯 All pages processed and saved!")
        else:
            print("❌ Failed to save complete results")


def main():
    # Check if .env file exists in parent directory
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        print(
            "❌ Please create a .env file in the server directory with your OPENAI_API_KEY"
        )
        print("Example .env file content:")
        print("OPENAI_API_KEY=your_api_key_here")
        return

    # Initialize translator
    translator = HindiPDFTranslator()

    print("\n📋 MAIN MENU:")
    print("1. Process PDF (extract and translate)")
    print("2. Search in existing JSON files")

    choice = input("\nChoose option (1 or 2): ").strip()

    if choice == "1":
        # Get PDF path from user
        pdf_path = input("Enter PDF file path: ").strip().strip('"')

        if not os.path.exists(pdf_path):
            print(f"❌ File not found: {pdf_path}")
            return

        print(f"\n🎯 Processing entire PDF automatically")
        translator.process_whole_pdf(pdf_path)

    elif choice == "2":
        translator.search_interface()

    else:
        print("❌ Invalid choice. Please run again and select 1 or 2.")
        return


if __name__ == "__main__":
    print("🚀 Hindi PDF OCR, Translator & Search Tool")
    print("📚 Extract, translate, and search Hindi PDF content")
    print("🔍 Search with highlighting and location details")
    print()
    main()
