import questionary
from telethon import TelegramClient
from telethon.tl.types import Channel, Chat
from app.logger import log

async def fetch_target_chats(client: TelegramClient):
    log.info("Fetching and categorizing dialogues...")
    targets = []
    
    # Iterates over all open dialogues, pulling titles and IDs
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        # Only select Entities that are public/private Channels or Groups
        if isinstance(entity, (Channel, Chat)):
            # Fallback for empty names
            title_str = dialog.name or f"Unnamed [{dialog.id}]"
            targets.append({"name": title_str, "value": dialog.id})
            
    log.info(f"Found {len(targets)} channels/groups eligible for cleanup.")
    return targets

async def select_chats_to_leave(targets: list):
    """
    Shows an interactive checkbox UI to select which chats to leave.
    Returns a list of IDs.
    """
    if not targets:
        log.info("No channels or groups point found.")
        return []
        
    print("\n")
    # Present interactive CLI checkboxes
    selected_ids = await questionary.checkbox(
        "Select the channels/groups you want to LEAVE (Space to select, Enter to confirm):",
        choices=targets,
        style=questionary.Style([
            ('qmark', 'fg:#ff9d00 bold'),
            ('question', 'bold'),
            ('answer', 'fg:#ff9d00 bold'),
            ('pointer', 'fg:#ff9d00 bold'),
            ('highlighted', 'fg:#ff9d00 bold'),
            ('selected', 'fg:#cc5454'),
            ('separator', 'fg:#cc5454'),
            ('instruction', ''),
            ('text', ''),
            ('disabled', 'fg:#858585 italic')
        ])
    ).ask_async()
    
    return selected_ids
