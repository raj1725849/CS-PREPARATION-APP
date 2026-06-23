import fitz
import os
import sys
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Set UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")
key = os.getenv("gemini_api_key3")
genai.configure(api_key=key)

pdf_path = r"C:\Users\LENOVO\Downloads\group 1 22.pdf"
doc = fitz.open(pdf_path)

# Extract text for JIGL (pages 2 to 20, which is 0-indexed 2 to 20, let's check)
# In our find_page_ranges.py, JIGL is listed as: Pages 2 to 20.
# Let's verify JIGL start/end pages.
# Let's extract text from page 2 to page 20 inclusive (0-indexed 2 to 20).
text_parts = []
for page_num in range(2, 21):
    text_parts.append(f"--- Page {page_num} ---\n{doc[page_num].get_text()}")

full_text = "\n".join(text_parts)

print(f"Extracted {len(full_text)} characters for JIGL from group 1 22.pdf")

prompt = """
You are an expert legal and educational data extraction engine.
TASK:
Extract the following text from an ICSI Executive Programme Guideline Answers PDF and convert it into a structured JSON knowledge base for AI-powered answer evaluation and automatic marking.

PDF TEXT:
\"\"\"
{pdf_text}
\"\"\"

IMPORTANT INSTRUCTIONS:
1. Extract EVERY question and sub-question present in the text.
2. For each question and sub-question, build the structured JSON according to the schema below.
3. Preserve the full, detailed guideline answer as "model_answer". Do not summarize.
4. For the "evaluation_rubric", identify "must_have_points", "important_points", and "optional_points".
5. Assign marks to each point. The sum of marks across must_have_points, important_points, and optional_points MUST add up exactly to the "max_marks" of the sub-question.
6. Extract sections, acts, and rules into "legal_provisions".
7. Extract case laws into "case_laws" with their name and principle.
8. Identify key terms/phrases for "keywords".
9. Set "expected_structure" to a list of phases or components (e.g., ["Definition", "Provision", "Explanation", "Conclusion"]).
10. If there are any "alternate_answers", "illustrations", "calculations", or tables, extract them into their respective fields.

JSON SCHEMA:
{
  "subject_code": "JIGL",
  "subject_name": "Jurisprudence, Interpretation & General Laws",
  "questions": [
    {
      "question_id": "JIGL_DEC2023_Q1A",
      "question_number": "1(a)",
      "max_marks": 4,
      "question_text": "...",
      "model_answer": "...",
      "legal_provisions": [
        {
          "act": "...",
          "section": "...",
          "description": "..."
        }
      ],
      "case_laws": [
        {
          "name": "...",
          "principle": "..."
        }
      ],
      "keywords": ["...", "..."],
      "expected_structure": ["...", "..."],
      "evaluation_rubric": {
        "must_have_points": [
          {
            "point": "...",
            "marks": 2
          }
        ],
        "important_points": [
          {
            "point": "...",
            "marks": 1
          }
        ],
        "optional_points": [
          {
            "point": "...",
            "marks": 1
          }
        ],
        "keyword_weightage": [],
        "strictness": "medium"
      },
      "alternate_answers": [],
      "illustrations": [],
      "calculations": []
    }
  ]
}

Ensure the output is ONLY valid JSON conforming to the schema. No markdown formatting, no code block backticks (like ```json), no preambles, and no explanation. Start with { and end with }.
""".replace("{pdf_text}", full_text)

print("Calling Gemini API...")
model = genai.GenerativeModel("gemini-2.5-flash", generation_config={"response_mime_type": "application/json"})
response = model.generate_content(prompt)

print("Response received.")
output_path = r"c:\Users\LENOVO\CS PREP\scratch\jigl_test.json"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(response.text)

print(f"Saved test output to {output_path}")
print(f"Output character count: {len(response.text)}")
try:
    data = json.loads(response.text)
    print("Parsed JSON successfully.")
    print(f"Subject: {data.get('subject_name')} ({data.get('subject_code')})")
    print(f"Number of questions: {len(data.get('questions', []))}")
except Exception as e:
    print(f"Failed to parse JSON: {e}")
