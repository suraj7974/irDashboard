from groq_client import GroqClient
import os
from pdf2image import convert_from_path
import pytesseract
import json
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

groq_client = GroqClient()

OUTPUT_FOLDER = "./summaries/"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


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
    """Count tokens in text using rough estimation (1 token ≈ 4 characters)"""
    return groq_client.count_tokens_estimate(text)


def split_text_to_chunks(text, max_tokens=None):  # Make adaptive
    """Split text into chunks that fit within token limits"""
    # Use adaptive chunking based on current model
    if max_tokens is None:
        return groq_client.split_text_adaptive(text, safety_margin=0.6)

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


def get_chunk_summary(text_chunk, chunk_index):
    """Process a single chunk and return structured data"""
    prompt = f"""
Analyze this Hindi Maoist report chunk and return structured JSON in this exact format:
{{
  "Name": "",
  "Aliases": [],
  "Group/Battalion": "",
  "Area/Region": "",
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

- Fill every field without skipping. Use 'Unknown' where no information is found.
- 'Villages Covered' should list all specific villages mentioned.
- 'Criminal Activities' should have Sr. No., Incident, Year, and Location.
- 'Maoist Hierarchical Role Changes' tracks the evolution of post/position.
- 'Police Encounters Participated' summarizes each police confrontation.
- 'Weapons/Assets Handled' includes any references to arms, explosives, or communications devices.
- 'All Maoists Met' includes every Maoist person named in the report with details.
- Answer strictly in JSON without commentary.

Report Text:
{text_chunk}
"""

    try:
        completion = groq_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        summary = completion.choices[0].message.content

        # Clean response and parse JSON
        if summary.startswith("```json"):
            summary = summary.split("```json")[1].split("```")[0]
        elif summary.startswith("```"):
            summary = summary.split("```")[1].split("```")[0]

        parsed_summary = json.loads(summary.strip())
        print(f"✅ Chunk {chunk_index + 1} processed successfully")
        return parsed_summary

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


def get_structured_summary(text):
    """Main function that handles chunking and merging"""
    # Check if text is too long and needs chunking
    token_count = count_tokens(text)
    print(f"📊 Text has {token_count} tokens")

    # Get optimal processing size for current model
    optimal_size = groq_client.get_optimal_chunk_size(
        safety_margin=0.8
    )  # 80% for direct processing

    if token_count <= optimal_size:  # Process directly if within optimal size
        print("📝 Processing text directly (no chunking needed)")
        chunk_summary = get_chunk_summary(text, 0)
        if chunk_summary:
            return json.dumps(chunk_summary, ensure_ascii=False, indent=2)

    # Text is too long, use adaptive chunking
    print("📝 Text too long, using adaptive chunking")
    chunks = groq_client.split_text_adaptive(
        text, safety_margin=0.6
    )  # 60% for chunked processing
    all_summaries = []

    for idx, chunk in enumerate(chunks):
        print(f"📝 Processing Chunk {idx+1}/{len(chunks)}")
        summary = get_chunk_summary(chunk, idx)
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
