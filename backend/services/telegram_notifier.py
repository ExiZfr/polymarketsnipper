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
    
    def send_trade_alert(self, trade_data: Dict) -> bool:
        """Send alert when a trade is executed"""
        market_title = trade_data.get('market_title', 'Unknown Market')
        side = trade_data.get('side', 'BUY').upper()
        amount = trade_data.get('amount', 0)
        price = trade_data.get('price', 0)
        market_url = trade_data.get('market_url', '')
        reason = trade_data.get('reason', 'Signal detected')
        
        # Emoji based on side
        emoji = '🟢' if side == 'BUY' else '🔴'
        
        message = f"""
{emoji} <b>TRADE EXECUTED</b> {emoji}

📊 <b>Market:</b> {market_title[:100]}

💰 <b>Side:</b> {side}
💵 <b>Amount:</b> ${amount:.2f}
🎯 <b>Price:</b> {price:.2f}%
💡 <b>Reason:</b> {reason}

🔗 <a href="{market_url}">View on Polymarket</a>

✅ Trade successfully placed!
"""
        
        return self.send_message(message.strip())
    
    def send_news_alert(self, news_data: Dict) -> bool:
        """Send alert when relevant news/signal is detected"""
        market_title = news_data.get('market_title', 'Unknown Market')
        source_type = news_data.get('source_type', 'unknown').upper()
        source_name = news_data.get('source_name', 'Unknown')
        content = news_data.get('content', '')[:200]  # Limit to 200 chars
        market_url = news_data.get('market_url', '')
        keywords = news_data.get('keywords', [])
        
        # Emoji based on source
        emoji_map = {
            'TWITTER': '🐦',
            'RSS': '📰',
            'NEWS': '📢'
        }
        emoji = emoji_map.get(source_type, '🔔')
        
        keywords_str = ', '.join(keywords[:5]) if keywords else 'N/A'
        
        message = f"""
{emoji} <b>NEWS SIGNAL DETECTED</b> {emoji}

📊 <b>Market:</b> {market_title[:100]}

📱 <b>Source:</b> {source_type} - {source_name}
🔑 <b>Keywords:</b> {keywords_str}

📝 <b>Content:</b>
<i>{content}...</i>

🔗 <a href="{market_url}">View Market</a>

⚡ Preparing to execute trade...
"""
        
        return self.send_message(message.strip())

# Singleton instance
telegram_notifier = TelegramNotifier()
