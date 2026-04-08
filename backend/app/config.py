import os
from dotenv import load_dotenv

# Path to the .env file in the backend directory
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
SESSION_NAME = os.getenv("SESSION_NAME", "cleaner_session")

if not API_ID or not API_HASH:
    raise ValueError("API_ID and API_HASH must be set in the .env file. Check README or execution steps.")
