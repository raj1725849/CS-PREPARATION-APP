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
        print(f"File: {os.path.basename(path)}")
        for i in range(min(3, len(doc))):
            text = doc[i].get_text()
            print(f"  Page {i} content:\n{text[:600]}")
            print("-" * 30)
        print("=" * 60)
