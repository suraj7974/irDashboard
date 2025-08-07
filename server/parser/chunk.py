from openai import OpenAI
import pytesseract
from pdf2image import convert_from_path
import os
import json
import tiktoken
import re
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


def count_tokens(text, model="gpt-4o"):
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))


def split_text_to_chunks(text, max_tokens=8000):
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
    cleaned = re.sub(r"```json|```", "", raw_response, flags=re.IGNORECASE).strip()
    return cleaned


def get_summary_chunk(text_chunk, idx):
    prompt = (
        prompt
    ) = f"""
Analyze this Hindi Maoist report chunk and return structured JSON in this exact format:
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
  "Villages Covered": [{{"Village": "", "District": ""}}],
  "Criminal Activities": [],
  "Maoist Hierarchical Role Changes": [],
  "Police Encounters Participated": [],
  "Weapons/Assets Handled": [],
  "Total Organizational Period": "",
  "Important Points": [],
  "All Maoists Met": [{{"Name": "", "Designation": "", "Date Met": ""}}]
}}

→ For each village, include the associated district if mentioned or 'Unknown'.
→ For 'All Maoists Met', give the name, designation (if known), and approximate date met (if known), otherwise leave date blank or 'Unknown'.
→ 'Supply Team/Supply' should include any information about supply operations, logistics, or supply teams.
→ 'IED/Bomb' should include any references to explosives, IEDs, bombs, or explosive-related activities.
→ 'Meeting' should include any information about meetings, gatherings, or organizational assemblies.
→ 'Platoon' should include any references to specific platoons, units, or military formations.
→ Strictly respond in JSON format only.
→ Fill every field fully. No fields should be left out.

Report Text:
{text_chunk}
"""

    completion = client.chat.completions.create(
        model="gpt-4o", messages=[{"role": "user", "content": prompt}], temperature=0.2
    )
    summary = completion.choices[0].message.content
    print(f"\nGPT Response for Chunk {idx+1}:\n{summary}\n")

    try:
        cleaned_summary = clean_gpt_response(summary)
        parsed_summary = json.loads(cleaned_summary)
        return parsed_summary
    except json.JSONDecodeError:
        print(f"❌ JSON Decode Error at Chunk {idx+1}, saving fallback response.")
        error_path = os.path.join(OUTPUT_FOLDER, f"error_chunk_{idx+1}.txt")
        with open(error_path, "w", encoding="utf-8") as f:
            f.write(summary)
        return None


def merge_summaries(all_summaries):
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
        "Criminal Activities": set(),
        "Maoist Hierarchical Role Changes": set(),
        "Police Encounters Participated": set(),
        "Weapons/Assets Handled": set(),
        "Total Organizational Period": Counter(),
        "Important Points": set(),
        "All Maoists Met": set(),
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
        merged["All Maoists Met"].update(summary.get("All Maoists Met", []))

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
            merged["IED/Bomb"].most_common(1)[0][0]
            if merged["IED/Bomb"]
            else "Unknown"
        ),
        "Meeting": (
            merged["Meeting"].most_common(1)[0][0]
            if merged["Meeting"]
            else "Unknown"
        ),
        "Platoon": (
            merged["Platoon"].most_common(1)[0][0]
            if merged["Platoon"]
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
        "All Maoists Met": list(merged["All Maoists Met"]),
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
