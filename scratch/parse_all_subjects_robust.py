import fitz
import os
import sys
import json
import time
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from dotenv import load_dotenv

# Set UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")

# Extract all keys
keys = [
    os.getenv("gemini_api_key3"),
    os.getenv("gemini_api_key4"),
    os.getenv("gemini_api_key2"),
    os.getenv("gemini_api_key1"),
]
# Filter out empty keys
KEYS = [k for k in keys if k]
if not KEYS:
    print("CRITICAL: No API keys found in .env!")
    sys.exit(1)

current_key_idx = 0
genai.configure(api_key=KEYS[current_key_idx])
print(f"Configured initial Gemini API Key (Key index {current_key_idx})")

subject_mappings = {
    "jurisprudence-interpretation-general-laws": [
        {"file": r"C:\Users\LENOVO\Downloads\group 1 22.pdf", "pages": list(range(2, 21)), "session": "DEC2023", "syllabus": "2022", "code": "JIGL"},
        {"file": r"C:\Users\LENOVO\Downloads\module 1 -23.pdf", "pages": list(range(2, 22)), "session": "DEC2023", "syllabus": "2017", "code": "JIGL"},
        {"file": r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf", "pages": list(range(2, 22)), "session": "JUNE2023", "syllabus": "2017", "code": "JIGL"}
    ],
    "company-law": [
        {"file": r"C:\Users\LENOVO\Downloads\group 1 22.pdf", "pages": list(range(21, 50)), "session": "DEC2023", "syllabus": "2022", "code": "CLP"},
        {"file": r"C:\Users\LENOVO\Downloads\module 1 -23.pdf", "pages": list(range(22, 49)), "session": "DEC2023", "syllabus": "2017", "code": "CL"},
        {"file": r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf", "pages": list(range(22, 43)), "session": "JUNE2023", "syllabus": "2017", "code": "CL"}
    ],
    "setting-up-of-business": [
        {"file": r"C:\Users\LENOVO\Downloads\group 1 22.pdf", "pages": list(range(50, 72)), "session": "DEC2023", "syllabus": "2022", "code": "SBILL"},
        {"file": r"C:\Users\LENOVO\Downloads\module 1 -23.pdf", "pages": list(range(49, 75)), "session": "DEC2023", "syllabus": "2017", "code": "SBEC"},
        {"file": r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf", "pages": list(range(43, 62)), "session": "JUNE2023", "syllabus": "2017", "code": "SBEC"}
    ],
    "corporate-accounting": [
        {"file": r"C:\Users\LENOVO\Downloads\group 1 22.pdf", "pages": list(range(72, 100)), "session": "DEC2023", "syllabus": "2022", "code": "CAFM"}
    ],
    "securities-law": [
        {"file": r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf", "pages": list(range(2, 32)), "session": "DEC2023", "syllabus": "2022", "code": "CMSL"},
        {"file": r"C:\Users\LENOVO\Downloads\module 2 -23.pdf", "pages": list(range(29, 52)), "session": "DEC2023", "syllabus": "2017", "code": "SLCM"}
    ],
    "economic-commercial-laws": [
        {"file": r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf", "pages": list(range(32, 48)), "session": "DEC2023", "syllabus": "2022", "code": "ECIPL"},
        {"file": r"C:\Users\LENOVO\Downloads\module 2 -23.pdf", "pages": list(range(52, 71)), "session": "DEC2023", "syllabus": "2017", "code": "EBCL"}
    ],
    "tax-laws": [
        {"file": r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf", "pages": list(range(48, 81)), "session": "DEC2023", "syllabus": "2022", "code": "TLP"}
    ]
}

def rotate_key():
    global current_key_idx
    current_key_idx = (current_key_idx + 1) % len(KEYS)
    genai.configure(api_key=KEYS[current_key_idx])
    print(f"--> KEY ROTATION: Switched to Gemini API Key (Key index {current_key_idx})")

def extract_text(pdf_path, pages):
    doc = fitz.open(pdf_path)
    text_parts = []
    for p in pages:
        if p < len(doc):
            text_parts.append(f"--- Page {p} ---\n{doc[p].get_text()}")
    return "\n".join(text_parts)

def call_gemini_with_retry(subject_name, text, session, syllabus, code):
    prompt = f"""
You are an expert legal and educational data extraction engine.
TASK:
Extract the following text from an ICSI Executive Programme Guideline Answers PDF and convert it into a structured JSON knowledge base for AI-powered answer evaluation and automatic marking.

EXAMINATION DETAILS:
Subject Name: {subject_name}
Subject Code: {code}
Exam Session: {session}
Syllabus: {syllabus}

PDF TEXT:
\"\"\"
{text}
\"\"\"

IMPORTANT INSTRUCTIONS:
1. Extract EVERY question and sub-question present in the text.
2. For each question and sub-question, build the structured JSON according to the schema below.
3. Preserve the full, detailed guideline answer as "model_answer". Do not summarize or shorten any answer.
4. For the "evaluation_rubric", identify "must_have_points", "important_points", and "optional_points".
5. Assign marks to each point. The sum of marks across must_have_points, important_points, and optional_points MUST add up exactly to the "max_marks" of the sub-question.
6. Extract sections, acts, and rules into "legal_provisions".
7. Extract case laws into "case_laws" with their name and principle.
8. Identify key terms/phrases for "keywords".
9. Set "expected_structure" to a list of phases or components (e.g., ["Definition", "Provision", "Explanation", "Conclusion"]).
10. If there are any "alternate_answers", "illustrations", "calculations", or tables, extract them into their respective fields.
11. Generate a unique "question_id" for each question/sub-question in the format: `{code}_{session}_{syllabus}_Q[Num]`, e.g., `{code}_{session}_{syllabus}_Q1A` or `{code}_{session}_{syllabus}_Q2B`.

JSON SCHEMA:
{{
  "subject_code": "{code}",
  "subject_name": "{subject_name}",
  "questions": [
    {{
      "question_id": "{code}_{session}_{syllabus}_Q1A",
      "question_number": "1(a)",
      "max_marks": 4,
      "question_text": "...",
      "model_answer": "...",
      "legal_provisions": [
        {{
          "act": "...",
          "section": "...",
          "description": "..."
        }}
      ],
      "case_laws": [
        {{
          "name": "...",
          "principle": "..."
        }}
      ],
      "keywords": ["...", "..."],
      "expected_structure": ["...", "..."],
      "evaluation_rubric": {{
        "must_have_points": [
          {{
            "point": "...",
            "marks": 2
          }}
        ],
        "important_points": [
          {{
            "point": "...",
            "marks": 1
          }}
        ],
        "optional_points": [
          {{
            "point": "...",
            "marks": 1
          }}
        ],
        "keyword_weightage": [],
        "strictness": "medium"
      }},
      "alternate_answers": [],
      "illustrations": [],
      "calculations": []
    }}
  ]
}}

Ensure the output is ONLY valid JSON conforming to the schema. No markdown formatting, no code block backticks (like ```json), no preambles, and no explanation. Start with {{ and end with }}.
"""
    print(f"  Requesting Gemini API for {code} ({session}, {syllabus})...")
    
    backoff_time = 5
    for attempt in range(8):
        try:
            model = genai.GenerativeModel("gemini-3.1-flash-lite", generation_config={"response_mime_type": "application/json"})
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            print(f"    Success: Extracted {len(data.get('questions', []))} questions.")
            return data
        except ResourceExhausted as re:
            print(f"    Rate limit hit (ResourceExhausted). Rotating API key and sleeping 15s...")
            rotate_key()
            # Sleep 15 seconds to let the rate limit window clear
            time.sleep(15)
        except GoogleAPIError as gae:
            print(f"    Google API Error: {gae}. Rotating API key and retrying...")
            rotate_key()
            time.sleep(2)
        except json.JSONDecodeError as jde:
            print(f"    JSON Decode Error on response. Retrying (Attempt {attempt+1}/8)...")
            time.sleep(2)
        except Exception as e:
            print(f"    Unexpected error: {type(e).__name__}: {e}. Retrying after sleep...")
            time.sleep(5)
            
    print(f"    Failed to extract for {code} ({session}, {syllabus}) after 8 attempts.")
    return None

def main():
    base_dir = r"c:\Users\LENOVO\CS PREP\evalution"
    
    # Process subject by subject
    for subject_slug, sources in subject_mappings.items():
        dest_dir = os.path.join(base_dir, subject_slug)
        dest_file = os.path.join(dest_dir, "2023.json")
        
        # SKIP if file already exists
        if os.path.exists(dest_file):
            print(f"\nSkipping {subject_slug} as it already has 2023.json")
            continue
            
        print(f"\n==========================================")
        print(f"STARTING SUBJECT: {subject_slug}")
        print(f"==========================================")
        
        subject_questions = []
        subject_name = ""
        subject_code = ""
        
        for source in sources:
            pdf_file = source["file"]
            if not os.path.exists(pdf_file):
                print(f"  File not found: {pdf_file}")
                continue
            
            print(f"  Extracting text from {os.path.basename(pdf_file)}, pages {source['pages'][0]} to {source['pages'][-1]}")
            text = extract_text(pdf_file, source["pages"])
            
            display_name = subject_slug.replace("-", " ").title()
            
            res_data = call_gemini_with_retry(
                subject_name=display_name,
                text=text,
                session=source["session"],
                syllabus=source["syllabus"],
                code=source["code"]
            )
            
            if res_data:
                subject_questions.extend(res_data.get("questions", []))
                subject_name = res_data.get("subject_name", display_name)
                subject_code = res_data.get("subject_code", source["code"])
            
            # Delay to prevent rate hits
            print("  Waiting 10 seconds before next call...")
            time.sleep(10)
            
        if subject_questions:
            final_json = {
                "subject_code": subject_code,
                "subject_name": subject_name,
                "questions": subject_questions
            }
            
            os.makedirs(dest_dir, exist_ok=True)
            with open(dest_file, "w", encoding="utf-8") as f:
                json.dump(final_json, f, indent=2, ensure_ascii=False)
            
            print(f"--> SUCCESS: Saved merged file to: {dest_file} with {len(subject_questions)} questions.")
        else:
            print(f"--> FAILED: No questions extracted for subject: {subject_slug}")

if __name__ == "__main__":
    main()
