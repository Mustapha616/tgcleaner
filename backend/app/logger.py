import logging
import sys

def setup_logger():
    logger = logging.getLogger("TGCleaner")
    logger.setLevel(logging.INFO)
    
    fmt = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    
    return logger

log = setup_logger()
