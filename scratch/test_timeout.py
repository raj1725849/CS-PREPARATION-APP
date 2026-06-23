import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"c:\Users\LENOVO\CS PREP\.env")
key = os.getenv("gemini_api_key3")

genai.configure(api_key=key)
try:
    model = genai.GenerativeModel("gemini-2.5-flash")
    # Test request_options timeout
    response = model.generate_content("Hello!", request_options={"timeout": 10})
    print(f"Success: {response.text.strip()}")
except Exception as e:
    print(f"Error: {e}")
