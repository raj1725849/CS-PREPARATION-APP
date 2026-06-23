import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")
key = os.getenv("gemini_api_key1")

print(f"Testing key 1: {key[:10]}...")
try:
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content("Say hello in one word.")
    print(f"Success: {response.text.strip()}")
except Exception as e:
    print(f"Error: {e}")
