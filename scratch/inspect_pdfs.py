import fitz # PyMuPDF
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
        try:
            doc = fitz.open(path)
            print(f"File: {os.path.basename(path)}")
            print(f"  Pages: {len(doc)}")
            # print first 300 chars of page 0
            if len(doc) > 0:
                print(f"  Page 0 preview:\n{doc[0].get_text()[:400]}")
            print("-" * 50)
        except Exception as e:
            print(f"Error reading {path}: {e}")
    else:
        print(f"Path does not exist: {path}")
