import fitz
import os
import re

pdf_paths = [
    r"C:\Users\LENOVO\Downloads\module 1 -23.pdf",
    r"C:\Users\LENOVO\Downloads\module 2 -23.pdf",
    r"C:\Users\LENOVO\Downloads\group 1 22.pdf",
    r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf",
    r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf"
]

for path in pdf_paths:
    if not os.path.exists(path):
        continue
    doc = fitz.open(path)
    print(f"File: {os.path.basename(path)} (Pages: {len(doc)})")
    
    # We will search each page's text for major subject headers
    for idx in range(len(doc)):
        text = doc[idx].get_text()
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines[:5]: # look at the top lines of each page
            if "EXECUTIVE PROGRAMME" in line.upper() or "EXAMINATION" in line.upper() or "SYLLABUS" in line.upper():
                # Print the context of this page
                print(f"  Page {idx}: {lines[:4]}")
                break
    print("=" * 60)
