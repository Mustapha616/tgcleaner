import asyncio
import random
from telethon import TelegramClient
from telethon.tl.functions.channels import LeaveChannelRequest
from telethon.tl.functions.messages import DeleteChatUserRequest
from telethon.errors import FloodWaitError
from app.logger import log

async def leave_chats(client: TelegramClient, target_ids: list):
    if not target_ids:
        log.info("No chats selected for leaving. Aborting cleaner.")
        return 0

    left_count = 0
    log.info(f"Initiating cleaner sequence. Identified {len(target_ids)} targets.")
    
    for chat_id in target_ids:
        try:
            try:
                # Execute MTProto leave function
                await client(LeaveChannelRequest(chat_id))
            except Exception as e:
                # If it's a basic group rather than a megagroup/channel, MTProto uses a different function
                if "CHAT_ID_INVALID" in str(e) or "CHANNEL_INVALID" in str(e):
                    await client(DeleteChatUserRequest(chat_id, 'me'))
                else:
                    raise e
            
            left_count += 1
            log.info(f"[{left_count}/{len(target_ids)}] Successfully left chat_id: {chat_id}")
            
            # Rate-limiting: Enforce Jitter between 1.0 and 3.5 seconds
            jitter_delay = random.uniform(1.0, 3.5)
            log.debug(f"Anti-ban jitter: sleeping for {jitter_delay:.2f}s...")
            await asyncio.sleep(jitter_delay)
            
        except FloodWaitError as e:
            # Crucial: Respond to precise Telegram platform rate limits
            log.warning(f"RATE LIMITED (FloodWaitError): Enforced pause for {e.seconds} seconds.")
            await asyncio.sleep(e.seconds)
            
        except Exception as e:
            log.error(f"Failed to leave ID {chat_id}: {str(e)}")
            
    log.info(f"Cleaning complete. Successfully left {left_count} chats.")
    return left_count
