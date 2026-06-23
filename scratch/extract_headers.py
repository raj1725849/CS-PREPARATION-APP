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
    print(f"\nFile: {os.path.basename(path)} (Pages: {len(doc)})")
    
    # We will look at first few lines of each page to find the subject code/name
    subjects = {}
    for idx in range(len(doc)):
        text = doc[idx].get_text()
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        found_code = None
        # Look for pattern EP...
        for line in lines[:10]:
            match = re.search(r'EP[\s\W\D_]*([A-Z&]{2,})', line)
            if match:
                found_code = match.group(1)
                break
        
        if found_code:
            if found_code not in subjects:
                subjects[found_code] = []
            subjects[found_code].append(idx)
            
    for code, pages in subjects.items():
        print(f"  Subject Code: {code} -> Pages {pages[0]} to {pages[-1]} (Total {len(pages)} pages)")
    print("=" * 60)
