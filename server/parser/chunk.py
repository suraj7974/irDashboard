from gemini_client import GeminiAIClient
import pytesseract
from pdf2image import convert_from_path
import os
import json
import re
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

ai_client = GeminiAIClient()

OUTPUT_FOLDER = "./summaries/"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def extract_text_from_pdf(pdf_path):
    print("\n📄 Converting PDF pages to images and extracting Hindi text...")
    pages = convert_from_path(pdf_path, dpi=300)
    print(f"✅ Found {len(pages)} pages")
    full_text = ""
    for idx, page in enumerate(pages):
        print(f"→ OCR Page {idx+1}")
        text = pytesseract.image_to_string(page, lang="hin")
        full_text += f"\nPage {idx+1}:\n{text}"
    print("✅ OCR extraction complete.\n")
    return full_text


def count_tokens(text, model="llama-3.1-70b-versatile"):
    """Count tokens in text using rough estimation"""
    return ai_client.count_tokens_estimate(text)


def split_text_to_chunks(text, max_tokens=None):  # Make max_tokens optional
    """Split text into chunks using adaptive sizing"""
    # If max_tokens not specified, use adaptive chunking
    if max_tokens is None:
        return ai_client.split_text_adaptive(text, safety_margin=0.6)

    # Legacy character-based chunking for specific max_tokens
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0

    for word in words:
        current_length += len(word) / 4
        current_chunk.append(word)
        if current_length >= max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_length = 0

    if current_chunk:
        chunks.append(" ".join(current_chunk))
    print(f"✅ Text split into {len(chunks)} chunks.")
    return chunks


def clean_gpt_response(raw_response):
    """
    Robust JSON cleaning and fixing for AI-generated responses
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

    # Try to find the JSON object bounds
    start_idx = raw_response.find("{")
    if start_idx == -1:
        raise ValueError("No JSON object found in response")

    # Find the matching closing brace using improved logic
    brace_count = 0
    end_idx = -1
    in_string = False
    escape_next = False
    bracket_count = 0

    for i in range(start_idx, len(raw_response)):
        char = raw_response[i]

        if escape_next:
            escape_next = False
            continue

        if char == "\\":
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
        elif not in_string:
            if char == "{":
                brace_count += 1
            elif char == "}":
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
            elif char == "[":
                bracket_count += 1
            elif char == "]":
                bracket_count -= 1

    if end_idx == -1:
        # If we can't find proper closing, try to fix it more intelligently
        print("⚠️ Incomplete JSON detected, attempting smart repair...")
        json_content = raw_response[start_idx:]
        
        # Try to find the last complete field before truncation
        lines = json_content.split('\n')
        valid_lines = []
        brace_count = 0
        bracket_count = 0
        in_string = False
        
        for line_idx, line in enumerate(lines):
            line_valid = True
            temp_brace = brace_count
            temp_bracket = bracket_count
            temp_in_string = in_string
            
            for char in line:
                if char == '"' and (len(valid_lines) == 0 or valid_lines[-1][-1] != '\\'):
                    temp_in_string = not temp_in_string
                elif not temp_in_string:
                    if char == '{':
                        temp_brace += 1
                    elif char == '}':
                        temp_brace -= 1
                    elif char == '[':
                        temp_bracket += 1
                    elif char == ']':
                        temp_bracket -= 1
            
            # Check if this line would create negative counts or unclosed strings
            if temp_brace < 0 or temp_bracket < 0:
                line_valid = False
                break
            
            # If line seems incomplete (ends with unfinished value), stop here
            if line.strip() and not line.strip().endswith((',', '{', '[', '}', ']', '"')):
                # Check if it's an incomplete field
                if ':' in line and not (line.strip().endswith('"') or line.strip().endswith('}') or line.strip().endswith(']')):
                    line_valid = False
                    break
            
            if line_valid:
                valid_lines.append(line)
                brace_count = temp_brace
                bracket_count = temp_bracket
                in_string = temp_in_string
            else:
                break
        
        # Reconstruct valid JSON
        json_content = '\n'.join(valid_lines)
        
        # Remove trailing comma if present
        json_content = json_content.rstrip().rstrip(',')
        
        # Close any unclosed structures
        while bracket_count > 0:
            json_content += ']'
            bracket_count -= 1
        
        while brace_count > 0:
            json_content += '}'
            brace_count -= 1
        
        raw_response = json_content
    else:
        raw_response = raw_response[start_idx:end_idx]

    # Additional cleaning: fix common JSON issues
    # Fix trailing commas
    raw_response = re.sub(r",(\s*[}\]])", r"\1", raw_response)

    print(f"🔧 Cleaned JSON (first 100 chars): {raw_response[:100]}...")

    # Final validation
    try:
        test_parse = json.loads(raw_response)
        print(f"✅ JSON validation successful")
        return raw_response
    except json.JSONDecodeError as validation_error:
        print(f"⚠️ JSON validation failed: {validation_error}")
        print(f"⚠️ Creating fallback response")
        
        # Create intelligent fallback
        fallback_data = {
            "Name": "Unknown",
            "Aliases": [],
            "Group/Battalion": "Unknown", 
            "Area/Region": "Unknown",
            "Supply Team/Supply": "Unknown",
            "IED/Bomb": "Unknown",
            "Meeting": "Unknown", 
            "Platoon": "Unknown",
            "Involvement": "Unknown",
            "History": "Unknown",
            "Bounty": "Unknown",
            "Villages Covered": [],
            "Criminal Activities": [],
            "Maoist Hierarchical Role Changes": [],
            "Police Encounters Participated": [],
            "Weapons/Assets Handled": [],
            "Total Organizational Period": "Unknown",
            "Important Points": ["JSON parsing failed - some data may be incomplete"],
            "Movement Routes": []
        }
        
        return json.dumps(fallback_data, ensure_ascii=False)


def get_summary_chunk(text_chunk, idx):
    prompt = f"""
You are an expert analyst specializing in parsing police reports related to Maoist surrenders and activities.

CRITICAL INSTRUCTIONS:
- You MUST respond ONLY in valid JSON format
- Do NOT include any commentary, explanations, or text outside the JSON
- You can respond in Hindi or English - whatever feels natural for the content
- For names and places, use the original script (Devanagari/Hindi is preferred for Hindi names)
- Ensure JSON structure is valid regardless of language used in values
- Keep responses concise - if any section becomes too long, summarize key points only
- NEVER exceed context limits - prioritize completeness over verbosity

Analyze this Maoist report chunk and return structured JSON in this exact format:
{{
  "Name": "",
  "Aliases": [],
  "Group/Battalion": "",
  "Area/Region": "",
  "Involvement": "",
  "History": "",
  "Bounty": "",
  "Villages Covered": [{{"Village": "", "District": ""}}],
  "Supply Team/Supply": "",
  "IED/Bomb": "",
  "Meeting": "",
  "Platoon": "",
  "Criminal Activities": [],
  "Maoist Hierarchical Role Changes": [],
  "Police Encounters Participated": [],
  "Weapons/Assets Handled": [],
  "Total Organizational Period": "",
  "Important Points": [],
  "Movement Routes": [
    {{
      "Route Name": "",
      "Description": "",
      "Purpose": "",
      "Frequency": "",
      "Segments": [
        {{
          "Sequence": 1,
          "From": "",
          "To": "",
          "Description": ""
        }}
      ]
    }}
  ]
}}

RULES:
- Fill every field without skipping. Use 'Unknown' या 'अज्ञात' where no information is found.
- For names with 'urf' (like "Suraj urf Don"), put the main name in "Name" field and the alias in "Aliases" array.
- For each village, include the associated district if mentioned or 'Unknown'/'अज्ञात'.

Important Guidelines:
- 'Supply Team/Supply' should include any information about supply operations, logistics, or supply teams.
- 'IED/Bomb' should include any references to explosives, IEDs, bombs, or explosive-related activities.
- 'Meeting' should include any information about meetings, gatherings, or organizational assemblies.
- 'Platoon' should include any references to specific platoons, units, or military formations.
- 'Movement Routes' should capture detailed route information including:
  * Route names and descriptions
  * Step-by-step movement with village-to-village transitions
  * Direction references and duration mentions
  * Movement patterns and transportation details
  * Look for keywords: मार्ग, रूट, जाने, आने, होते हुए, की ओर, etc.
- You can use Hindi/Devanagari for names, places, and descriptions - this is preferred for Hindi content.
- Strictly respond in JSON format only.
- Fill every field fully. No fields should be left out.

Report Text:
{text_chunk}
"""

    completion = ai_client.chat_completion(
        messages=[{"role": "user", "content": prompt}], temperature=0.2
    )
    summary = completion.choices[0].message.content
    print(f"\nGPT Response for Chunk {idx+1}:\n{summary}\n")

    try:
        cleaned_summary = clean_gpt_response(summary)
        parsed_summary = json.loads(cleaned_summary)
        return parsed_summary
    except json.JSONDecodeError as json_err:
        print(f"❌ JSON Decode Error at Chunk {idx+1}: {json_err}")
        error_path = os.path.join(OUTPUT_FOLDER, f"error_chunk_{idx+1}.txt")
        with open(error_path, "w", encoding="utf-8") as f:
            f.write(f"Original response:\n{summary}\n\n")
            f.write(f"Cleaned response:\n{cleaned_summary}\n\n")
            f.write(f"Error: {json_err}")
        print(f"💾 Error details saved to: {error_path}")
        return None
    except Exception as e:
        print(f"❌ General error processing chunk {idx+1}: {e}")
        return None


def merge_summaries(all_summaries):
    merged = {
        "Name": "Unknown",
        "Aliases": set(),
        "Group/Battalion": Counter(),
        "Area/Region": Counter(),
        "Involvement": Counter(),
        "History": Counter(),
        "Bounty": Counter(),
        "Villages Covered": set(),
        "Supply Team/Supply": Counter(),
        "IED/Bomb": Counter(),
        "Meeting": Counter(),
        "Platoon": Counter(),
        "Criminal Activities": set(),
        "Maoist Hierarchical Role Changes": set(),
        "Police Encounters Participated": set(),
        "Weapons/Assets Handled": set(),
        "Total Organizational Period": Counter(),
        "Important Points": set(),
        "Movement Routes": [],
    }

    for summary in all_summaries:
        if not summary:
            continue
        merged["Aliases"].update(summary.get("Aliases", []))
        merged["Villages Covered"].update(summary.get("Villages Covered", []))
        merged["Criminal Activities"].update(summary.get("Criminal Activities", []))
        merged["Maoist Hierarchical Role Changes"].update(
            summary.get("Maoist Hierarchical Role Changes", [])
        )
        merged["Police Encounters Participated"].update(
            summary.get("Police Encounters Participated", [])
        )
        merged["Weapons/Assets Handled"].update(
            summary.get("Weapons/Assets Handled", [])
        )
        merged["Important Points"].update(summary.get("Important Points", []))

        # Merge movement routes
        movement_routes = summary.get("Movement Routes", [])
        if movement_routes:
            merged["Movement Routes"].extend(movement_routes)

        for field in [
            "Group/Battalion",
            "Area/Region",
            "Involvement",
            "History",
            "Bounty",
            "Supply Team/Supply",
            "IED/Bomb",
            "Meeting",
            "Platoon",
            "Total Organizational Period",
        ]:
            value = summary.get(field, "Unknown")
            if value and value != "Unknown":
                merged[field][value] += 1

        if merged["Name"] == "Unknown" and summary.get("Name") != "Unknown":
            merged["Name"] = summary["Name"]

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
        "Criminal Activities": list(merged["Criminal Activities"]),
        "Maoist Hierarchical Role Changes": list(
            merged["Maoist Hierarchical Role Changes"]
        ),
        "Police Encounters Participated": list(
            merged["Police Encounters Participated"]
        ),
        "Weapons/Assets Handled": list(merged["Weapons/Assets Handled"]),
        "Total Organizational Period": (
            merged["Total Organizational Period"].most_common(1)[0][0]
            if merged["Total Organizational Period"]
            else "Unknown"
        ),
        "Important Points": list(merged["Important Points"]),
        "Movement Routes": merged["Movement Routes"],  # Keep nested structure
    }
    return final_result


def process_pdf(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    chunks = split_text_to_chunks(raw_text)

    all_summaries = []
    for idx, chunk in enumerate(chunks):
        print(f"📝 Processing Chunk {idx+1}/{len(chunks)}")
        summary = get_summary_chunk(chunk, idx)
        if summary:
            all_summaries.append(summary)
            print(f"✅ Chunk {idx+1} summarized.")
        else:
            print(f"⚠️ Skipped Chunk {idx+1} due to parsing error.")

    merged_summary = merge_summaries(all_summaries)

    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_path = os.path.join(OUTPUT_FOLDER, f"{base_name}_summary.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged_summary, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Final merged summary saved to {output_path}")


def main():
    pdf_path = input("📂 Enter path of the scanned Maoist PDF report: ").strip()
    if not os.path.isfile(pdf_path):
        print("❌ Invalid file path. Exiting.")
        return
    process_pdf(pdf_path)


if __name__ == "__main__":
    main()
