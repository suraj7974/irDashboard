from openai import OpenAI
import os
from pdf2image import convert_from_path
import pytesseract
import json
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


def get_structured_summary(text):
    prompt = f"""
    Analyze the following Hindi Maoist report and provide structured JSON with these fields:
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
    - Fill every field without skipping. Use 'Unknown' where no information is found.
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
    - Answer strictly in JSON without commentary.
    Report:\n{text}
    """

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    summary = completion.choices[0].message.content
    return summary


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
