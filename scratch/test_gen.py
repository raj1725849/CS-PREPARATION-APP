import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")
key = os.getenv("gemini_api_key3") # Let's use key 3

genai.configure(api_key=key)
model = genai.GenerativeModel("gemini-2.5-flash")
response = model.generate_content("Explain 'res judicata' in one sentence.")
print(response.text)
