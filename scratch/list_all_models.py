import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")
key = os.getenv("gemini_api_key3")

genai.configure(api_key=key)
try:
    print("Listing all models:")
    for m in genai.list_models():
        print(f"  Model: {m.name} (Supported: {m.supported_generation_methods})")
except Exception as e:
    print(f"Error: {e}")
