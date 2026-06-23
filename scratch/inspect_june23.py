import fitz
doc = fitz.open(r"C:\Users\LENOVO\Downloads\Guideline_Answer( EP)_Module 1.pdf")
print("Guideline_Answer( EP)_Module 1.pdf:")
for i in range(5):
    print(f"Page {i} starts with:\n{doc[i].get_text()[:400]}")
    print("-" * 30)
