from telethon import TelegramClient
from app.config import API_ID, API_HASH, SESSION_NAME
from app.logger import log

async def get_client() -> TelegramClient:
    log.info("Initializing Telethon client...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    # .start() will automatically handle terminal prompts for Phone Number and OTP Code
    await client.start()
    
    log.info("Client authenticated successfully.")
    return client
