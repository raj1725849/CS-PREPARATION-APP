import fitz
import os

pdf_paths = [
    r"C:\Users\LENOVO\Downloads\module 1 -23.pdf",
    r"C:\Users\LENOVO\Downloads\module 2 -23.pdf",
    r"C:\Users\LENOVO\Downloads\group 1 22.pdf",
    r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf",
    r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf"
]

for path in pdf_paths:
    if os.path.exists(path):
        doc = fitz.open(path)
        print(f"File: {os.path.basename(path)} (Pages: {len(doc)})")
        # Let's search for the page numbers of each subject from the CONTENTS page
        for i in range(min(5, len(doc))):
            text = doc[i].get_text()
            if "C  O  N  T  E  N  T  S" in text or "CONTENTS" in text:
                print(f"Index Page {i}:\n{text}")
        print("=" * 60)
