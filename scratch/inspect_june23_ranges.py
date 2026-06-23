import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open(r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf")
print(f"Total pages: {len(doc)}")

for idx in range(len(doc)):
    text = doc[idx].get_text()
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    for line in lines[:5]:
        if "COMPANY LAW" in line.upper() or "SETTING UP OF BUSINESS" in line.upper() or "TAX LAWS" in line.upper() or "EXECUTIVE PROGRAMME" in line.upper():
            print(f"Page {idx}: {lines[:4]}")
            break
