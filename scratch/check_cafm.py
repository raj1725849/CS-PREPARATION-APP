import fitz
import sys

# Set encoding to utf-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open(r"C:\Users\LENOVO\Downloads\group 1 22.pdf")
print("Page 71 text:")
print(doc[71].get_text()[:600])
print("\nPage 72 text:")
print(doc[72].get_text()[:600])
print("\nPage 73 text:")
print(doc[73].get_text()[:600])
