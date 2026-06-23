import fitz
doc = fitz.open(r"C:\Users\LENOVO\Downloads\EP_GROUP_2_SYLLABUS_DEC_05032023.pdf")
print("Page 48 text preview:")
print(doc[48].get_text()[:600])
