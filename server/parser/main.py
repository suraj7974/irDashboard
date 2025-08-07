from multi_ai_client import MultiAIClient
import os
from pdf2image import convert_from_path
import pytesseract
import json
import re
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

ai_client = MultiAIClient()

OUTPUT_FOLDER = "./summaries/"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def clean_ai_json_response(raw_response):
    """
    Robust JSON cleaning and fixing for AI-generated responses
    Handles Unicode, Hindi text, and malformed JSON
    """
    print(f"🧠 Raw summary (first 100 chars): {raw_response[:100]}...")

    # Handle Unicode properly
    if isinstance(raw_response, bytes):
        raw_response = raw_response.decode("utf-8", errors="replace")

    # Remove code block markers
    if raw_response.startswith("```json"):
        raw_response = raw_response.split("```json")[1].split("```")[0]
    elif raw_response.startswith("```"):
        raw_response = raw_response.split("```")[1].split("```")[0]

    # Strip whitespace
    raw_response = raw_response.strip()

    # Remove any non-JSON text before the first {
    if "Here is the" in raw_response or "The JSON" in raw_response:
        lines = raw_response.split("\n")
        json_lines = []
        found_start = False
        for line in lines:
            if line.strip().startswith("{") or found_start:
                found_start = True
                json_lines.append(line)
        raw_response = "\n".join(json_lines)

    # Try to find the JSON object bounds
    start_idx = raw_response.find("{")
    if start_idx == -1:
        raise ValueError("No JSON object found in response")

    # Find the matching closing brace
    brace_count = 0
    end_idx = -1
    in_string = False
    escape_next = False

    for i in range(start_idx, len(raw_response)):
        char = raw_response[i]

        if escape_next:
            escape_next = False
            continue

        if char == "\\":
            escape_next = True
            continue

        if char == '"':
            in_string = not in_string
        elif not in_string:
            if char == "{":
                brace_count += 1
            elif char == "}":
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break

    if end_idx == -1:
        # If we can't find proper closing, try to fix it
        print("⚠️ Incomplete JSON detected, attempting to fix...")
        json_content = raw_response[start_idx:]

        # Find last complete field or object
        last_complete_pos = len(json_content) - 1
        brace_count = 0
        in_string = False
        escape_next = False

        for i, char in enumerate(json_content):
            if escape_next:
                escape_next = False
                continue

            if char == "\\":
                escape_next = True
                continue

            if char == '"':
                in_string = not in_string
            elif not in_string:
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                elif char in [",", "]"] and brace_count == 1:
                    last_complete_pos = i

        # Truncate and close properly
        json_content = json_content[: last_complete_pos + 1]

        # Remove trailing comma if present
        json_content = json_content.rstrip().rstrip(",")

        # Add missing closing braces
        while brace_count > 0:
            json_content += "}"
            brace_count -= 1

        raw_response = json_content
    else:
        raw_response = raw_response[start_idx:end_idx]

    # Additional cleaning: fix common JSON issues
    # Fix trailing commas before closing braces/brackets
    raw_response = re.sub(r",(\s*[}\]])", r"\1", raw_response)

    # Fix multiple consecutive commas
    raw_response = re.sub(r",+", r",", raw_response)

    # Fix unescaped quotes in strings (more robust)
    # This handles cases where quotes appear in the middle of strings
    lines = raw_response.split("\n")
    fixed_lines = []

    for line in lines:
        # Only fix lines that look like JSON field assignments
        if ":" in line and '"' in line:
            # Split on the first colon to separate key from value
            if line.count(":") >= 1:
                key_part, value_part = line.split(":", 1)
                # Fix unescaped quotes in the value part only
                if value_part.strip().startswith('"') and value_part.strip().endswith(
                    '"'
                ):
                    # This is a string value, fix internal quotes
                    value_content = value_part.strip()[1:-1]  # Remove outer quotes
                    value_content = value_content.replace(
                        '"', '\\"'
                    )  # Escape internal quotes
                    value_part = value_part.replace(
                        value_part.strip(), f'"{value_content}"'
                    )
                line = key_part + ":" + value_part
        fixed_lines.append(line)

    raw_response = "\n".join(fixed_lines)

    print(f"🔧 Cleaned JSON (first 200 chars): {raw_response[:200]}...")

    return raw_response


def extract_text_from_pdf(pdf_path):
    print(f"\n📄 Extracting text from {os.path.basename(pdf_path)}")
    pages = convert_from_path(pdf_path, dpi=300)
    print(f"✅ Found {len(pages)} pages")
    full_text = ""
    for idx, page in enumerate(pages):
        print(f"→ Extracting Page {idx + 1}")
        text = pytesseract.image_to_string(page, lang="hin")
        full_text += f"\nPage {idx + 1}:\n{text}"
    print(f"✅ Text extraction completed for {os.path.basename(pdf_path)}")
    return full_text


def count_tokens(text, model="llama-3.1-70b-versatile"):
    """Count tokens in text using rough estimation"""
    return ai_client.count_tokens_estimate(text)


def split_text_to_chunks(text, max_tokens=None):  # Make adaptive
    """Split text into chunks that fit within token limits"""
    # Use adaptive chunking based on current model
    if max_tokens is None:
        return ai_client.split_text_adaptive(text, safety_margin=0.6)

    # Legacy fixed-size chunking if max_tokens specified
    # Use Groq client's token estimation
    # Fallback to character-based chunking since tiktoken isn't available
    max_chars = max_tokens * 4  # Rough approximation
    chunks = []
    lines = text.split("\n")
    current_chunk = []
    current_chars = 0

    for line in lines:
        line_chars = len(line)
        if current_chars + line_chars > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_chars = line_chars
        else:
            current_chunk.append(line)
            current_chars += line_chars

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    print(f"📝 Split text into {len(chunks)} chunks (fixed-size)")
    return chunks


def get_chunk_summary(text_chunk, chunk_index, pdf_filename="unknown.pdf"):
    """Process a single chunk and return structured data"""
    prompt = f"""
You are an expert analyst specializing in parsing police reports related to Maoist surrenders and activities.

CRITICAL INSTRUCTIONS:
- You MUST respond ONLY in valid JSON format
- Do NOT include any commentary, explanations, or text outside the JSON
- You can respond in Hindi or English - whatever feels natural for the content
- For names and places, use the original script (Devanagari/Hindi is preferred for Hindi names)
- Ensure JSON structure is valid regardless of language used in values

Analyze this Maoist report chunk and return structured JSON in this exact format:
{{
  "Name": "",
  "Aliases": [],
  "Group/Battalion": "",
  "Area/Region": "",
  "Supply Team/Supply": "",
  "IED/Bomb": "",
  "Meeting": "",
  "Platoon": "",
  "Involvement": "",
  "History": "",
  "Bounty": "",
  "Villages Covered": [],
  "Criminal Activities": [
    {{
      "Sr. No.": 1,
      "Incident": "",
      "Year": "",
      "Location": ""
    }}
  ],
  "Maoist Hierarchical Role Changes": [
    {{
      "Year": "",
      "Role": ""
    }}
  ],
  "Police Encounters Participated": [
    {{
      "Year": "",
      "Encounter Details": ""
    }}
  ],
  "Weapons/Assets Handled": [],
  "Total Organizational Period": "",
  "Important Points": [],
  "All Maoists Met": [
    {{
      "Sr. No.": 1,
      "Name": "",
      "Group": "",
      "Year Met": "",
      "Bounty/Rank/Importance": ""
    }}
  ]
}}

RULES:
- Fill every field without skipping. Use 'Unknown' या 'अज्ञात' where no information is found.
- For names with 'urf' (like "Suraj urf Don"), put the main name in "Name" field and the alias in "Aliases" array.
- 'Villages Covered' should list all specific villages mentioned.
- 'Supply Team/Supply' should include any information about supply operations, logistics, or supply teams.
- 'IED/Bomb' should include any references to explosives, IEDs, bombs, or explosive-related activities.
- 'Meeting' should include any information about meetings, gatherings, or organizational assemblies.
- 'Platoon' should include any references to specific platoons, units, or military formations.
- 'Criminal Activities' should have Sr. No., Incident, Year, and Location.
- 'Maoist Hierarchical Role Changes' tracks the evolution of post/position.
- 'Police Encounters Participated' summarizes each police confrontation.
- 'Weapons/Assets Handled' includes any references to arms, explosives, or communications devices.
- 'All Maoists Met' includes every Maoist person named in the report with details.
- Answer strictly in JSON without commentary or explanations.
- Feel free to use Hindi/Devanagari for names, places, and descriptions - this is preferred for Hindi content.

Report Text:
{text_chunk}
"""

    try:
        completion = ai_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        summary = completion.choices[0].message.content

        # Use robust JSON cleaning
        try:
            cleaned_summary = clean_ai_json_response(summary)
            parsed_summary = json.loads(cleaned_summary)
            print(f"✅ Chunk {chunk_index + 1} processed successfully")
            return parsed_summary

        except json.JSONDecodeError as json_err:
            print(f"❌ JSON parsing failed for chunk {chunk_index + 1}: {json_err}")

            # Try alternative parsing strategies
            try:
                print("🔄 Attempting alternative JSON parsing...")

                # Strategy 1: Extract only the JSON part more aggressively
                json_start = summary.find("{")
                json_end = summary.rfind("}")
                if json_start != -1 and json_end != -1 and json_end > json_start:
                    json_only = summary[json_start : json_end + 1]

                    # Clean control characters and invalid Unicode
                    import re

                    json_only = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", json_only)

                    # Try to parse the extracted JSON
                    parsed_summary = json.loads(json_only)
                    print(
                        f"✅ Chunk {chunk_index + 1} processed with alternative parsing"
                    )
                    return parsed_summary

            except json.JSONDecodeError:
                pass

            try:
                # Strategy 2: Use ast.literal_eval as a fallback
                import ast

                # Convert to Python-like syntax and evaluate
                python_like = (
                    cleaned_summary.replace("true", "True")
                    .replace("false", "False")
                    .replace("null", "None")
                )
                parsed_summary = ast.literal_eval(python_like)
                print(f"✅ Chunk {chunk_index + 1} processed with AST parsing")
                return parsed_summary

            except (ValueError, SyntaxError):
                pass

            # Strategy 3: Create a minimal valid response
            print("⚠️ Creating minimal fallback response...")
            fallback_response = {
                "Name": "अज्ञात",
                "Aliases": [],
                "Group/Battalion": "अज्ञात",
                "Area/Region": "अज्ञात",
                "Supply Team/Supply": "अज्ञात",
                "IED/Bomb": "अज्ञात",
                "Meeting": "अज्ञात",
                "Platoon": "अज्ञात",
                "Involvement": "अज्ञात",
                "History": "अज्ञात",
                "Bounty": "अज्ञात",
                "Villages Covered": [],
                "Criminal Activities": [],
                "Maoist Hierarchical Role Changes": [],
                "Police Encounters Participated": [],
                "Weapons/Assets Handled": [],
                "Total Organizational Period": "अज्ञात",
                "Important Points": [
                    f"Failed to parse chunk {chunk_index + 1} - original text may contain important information"
                ],
                "All Maoists Met": [],
            }

            # Save the problematic response for debugging
            error_file = os.path.join(
                OUTPUT_FOLDER, f"error_chunk_{chunk_index + 1}.txt"
            )
            with open(error_file, "w", encoding="utf-8") as f:
                f.write(f"Original response:\n{summary}\n\n")
                f.write(f"Cleaned response:\n{cleaned_summary}\n\n")
                f.write(f"Error: {json_err}")

            print(f"💾 Error details saved to: {error_file}")
            return fallback_response

    except Exception as e:
        print(f"❌ Error processing chunk {chunk_index + 1}: {e}")
        return None


def merge_chunk_summaries(all_summaries):
    """Merge multiple chunk summaries into a single comprehensive summary"""
    merged = {
        "Name": "Unknown",
        "Aliases": set(),
        "Group/Battalion": Counter(),
        "Area/Region": Counter(),
        "Supply Team/Supply": Counter(),
        "IED/Bomb": Counter(),
        "Meeting": Counter(),
        "Platoon": Counter(),
        "Involvement": Counter(),
        "History": Counter(),
        "Bounty": Counter(),
        "Villages Covered": set(),
        "Criminal Activities": [],
        "Maoist Hierarchical Role Changes": [],
        "Police Encounters Participated": [],
        "Weapons/Assets Handled": set(),
        "Total Organizational Period": Counter(),
        "Important Points": set(),
        "All Maoists Met": [],
    }

    for summary in all_summaries:
        if not summary:
            continue

        # Merge simple lists
        merged["Aliases"].update(summary.get("Aliases", []))
        merged["Villages Covered"].update(summary.get("Villages Covered", []))
        merged["Weapons/Assets Handled"].update(
            summary.get("Weapons/Assets Handled", [])
        )
        merged["Important Points"].update(summary.get("Important Points", []))

        # Merge nested structured data
        criminal_activities = summary.get("Criminal Activities", [])
        if criminal_activities:
            merged["Criminal Activities"].extend(criminal_activities)

        role_changes = summary.get("Maoist Hierarchical Role Changes", [])
        if role_changes:
            merged["Maoist Hierarchical Role Changes"].extend(role_changes)

        encounters = summary.get("Police Encounters Participated", [])
        if encounters:
            merged["Police Encounters Participated"].extend(encounters)

        maoists_met = summary.get("All Maoists Met", [])
        if maoists_met:
            merged["All Maoists Met"].extend(maoists_met)

        # Count frequency for single-value fields
        for field in [
            "Group/Battalion",
            "Area/Region",
            "Supply Team/Supply",
            "IED/Bomb",
            "Meeting",
            "Platoon",
            "Involvement",
            "History",
            "Bounty",
            "Total Organizational Period",
        ]:
            value = summary.get(field, "Unknown")
            if value and value != "Unknown" and value.strip():
                merged[field][value] += 1

        # Take the first non-Unknown name
        if (
            merged["Name"] == "Unknown"
            and summary.get("Name")
            and summary.get("Name") != "Unknown"
        ):
            merged["Name"] = summary["Name"]

    # Convert to final format - preserve nested structure
    final_result = {
        "Name": merged["Name"],
        "Aliases": list(merged["Aliases"]),
        "Group/Battalion": (
            merged["Group/Battalion"].most_common(1)[0][0]
            if merged["Group/Battalion"]
            else "Unknown"
        ),
        "Area/Region": (
            merged["Area/Region"].most_common(1)[0][0]
            if merged["Area/Region"]
            else "Unknown"
        ),
        "Supply Team/Supply": (
            merged["Supply Team/Supply"].most_common(1)[0][0]
            if merged["Supply Team/Supply"]
            else "Unknown"
        ),
        "IED/Bomb": (
            merged["IED/Bomb"].most_common(1)[0][0] if merged["IED/Bomb"] else "Unknown"
        ),
        "Meeting": (
            merged["Meeting"].most_common(1)[0][0] if merged["Meeting"] else "Unknown"
        ),
        "Platoon": (
            merged["Platoon"].most_common(1)[0][0] if merged["Platoon"] else "Unknown"
        ),
        "Involvement": (
            merged["Involvement"].most_common(1)[0][0]
            if merged["Involvement"]
            else "Unknown"
        ),
        "History": (
            merged["History"].most_common(1)[0][0] if merged["History"] else "Unknown"
        ),
        "Bounty": (
            merged["Bounty"].most_common(1)[0][0] if merged["Bounty"] else "Unknown"
        ),
        "Villages Covered": list(merged["Villages Covered"]),
        "Criminal Activities": merged["Criminal Activities"],  # Keep nested structure
        "Maoist Hierarchical Role Changes": merged[
            "Maoist Hierarchical Role Changes"
        ],  # Keep nested structure
        "Police Encounters Participated": merged[
            "Police Encounters Participated"
        ],  # Keep nested structure
        "Weapons/Assets Handled": list(merged["Weapons/Assets Handled"]),
        "Total Organizational Period": (
            merged["Total Organizational Period"].most_common(1)[0][0]
            if merged["Total Organizational Period"]
            else "Unknown"
        ),
        "Important Points": list(merged["Important Points"]),
        "All Maoists Met": merged["All Maoists Met"],  # Keep nested structure
    }

    return final_result


def get_structured_summary(text, pdf_filename="unknown.pdf"):
    """Main function that handles chunking and merging"""
    # Check if text is too long and needs chunking
    token_count = count_tokens(text)
    print(f"📊 Text has {token_count} tokens")

    # Get optimal processing size for current model
    optimal_size = ai_client.get_optimal_chunk_size(
        safety_margin=0.8
    )  # 80% for direct processing

    if token_count <= optimal_size:  # Process directly if within optimal size
        print("📝 Processing text directly (no chunking needed)")
        chunk_summary = get_chunk_summary(text, 0, pdf_filename)
        if chunk_summary:
            return json.dumps(chunk_summary, ensure_ascii=False, indent=2)

    # Text is too long, use adaptive chunking
    print("📝 Text too long, using adaptive chunking")
    chunks = ai_client.split_text_adaptive(
        text, safety_margin=0.6
    )  # 60% for chunked processing
    all_summaries = []

    for idx, chunk in enumerate(chunks):
        print(f"📝 Processing Chunk {idx+1}/{len(chunks)}")
        summary = get_chunk_summary(chunk, idx, pdf_filename)
        if summary:
            all_summaries.append(summary)

    # Merge all chunk summaries
    merged_summary = merge_chunk_summaries(all_summaries)
    return json.dumps(merged_summary, ensure_ascii=False, indent=2)


def save_summary(pdf_filename, summary):
    base_name = os.path.splitext(pdf_filename)[0]
    json_path = os.path.join(OUTPUT_FOLDER, f"{base_name}_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(summary)
    print(f"✅ Summary saved to {json_path}")


def main():
    pdf_path = input("📂 Enter path of the Maoist PDF report: ").strip()
    if not os.path.isfile(pdf_path):
        print("❌ Invalid file path. Exiting.")
        return

    text = extract_text_from_pdf(pdf_path)
    summary = get_structured_summary(text)
    save_summary(os.path.basename(pdf_path), summary)
    print("✅ Report processed and summary saved!")


if __name__ == "__main__":
    main()
