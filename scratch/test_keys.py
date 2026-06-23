import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")

keys = [
    os.getenv("gemini_api_key1"),
    os.getenv("gemini_api_key2"),
    os.getenv("gemini_api_key3"),
    os.getenv("gemini_api_key4"),
]

for idx, key in enumerate(keys, 1):
    if not key:
        print(f"Key {idx} is empty")
        continue
    
    print(f"Testing key {idx} list_models...")
    try:
        genai.configure(api_key=key)
        for m in genai.list_models():
            print(f"  Supported model: {m.name}")
            break # Just print one to see if it works
    except Exception as e:
        print(f"Key {idx} failed: {e}")
