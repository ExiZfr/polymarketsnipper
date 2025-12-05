"""
Telegram notification service for critical market alerts
"""
import os
import logging
import requests
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class TelegramNotifier:
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN', '')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID', '')
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if not self.enabled:
            logger.warning("⚠️ Telegram notifications disabled - missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        else:
            logger.info("✅ Telegram notifications enabled")
    
    def send_message(self, message: str, parse_mode: str = 'HTML') -> bool:
        """Send a message via Telegram bot"""
        if not self.enabled:
            logger.debug(f"Telegram disabled, would have sent: {message}")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': parse_mode,
                'disable_web_page_preview': False
            }
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                logger.info("✅ Telegram message sent successfully")
                return True
            else:
                logger.error(f"❌ Telegram API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram message: {e}")
            return False
    
    def send_critical_market_alert(self, market: Dict) -> bool:
        """Send alert for critical urgency market"""
        urgency_rate = market.get('urgency_rate', 0)
        snipe_score = market.get('snipe_score', 0) * 100
        title = market.get('title', 'Unknown Market')
        url = market.get('url', '')
        days_remaining = market.get('days_remaining', 'N/A')
        volume = market.get('volume', 0)
        category = market.get('category', 'unknown').capitalize()
        
        # Format message with HTML
        message = f"""
🚨 <b>CRITICAL MARKET ALERT</b> 🚨

📊 <b>Market:</b> {title[:100]}

⚡ <b>Urgency Rate:</b> {urgency_rate}% (CRITICAL!)
🔥 <b>Snipability:</b> {snipe_score:.0f}%
⏰ <b>Time Left:</b> {days_remaining} days
💰 <b>Volume:</b> ${volume:,.0f}
📁 <b>Category:</b> {category}

🔗 <a href="{url}">View on Polymarket</a>

⚠️ <b>Action Required:</b> This market requires immediate attention!
"""
        
        return self.send_message(message.strip())
    
    def send_new_market_alert(self, market: Dict) -> bool:
        """Send alert for newly detected high-quality market"""
        snipe_score = market.get('snipe_score', 0) * 100
        urgency_rate = market.get('urgency_rate', 0)
        title = market.get('title', 'Unknown Market')
        url = market.get('url', '')
        
        message = f"""
✨ <b>NEW HIGH-QUALITY MARKET</b>

📊 {title[:100]}

🔥 Snipability: {snipe_score:.0f}%
⚡ Urgency: {urgency_rate}%

🔗 <a href="{url}">View on Polymarket</a>
"""
        
        return self.send_message(message.strip())

# Singleton instance
telegram_notifier = TelegramNotifier()
