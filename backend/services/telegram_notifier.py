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
    
    def reload_config(self):
        """Reload configuration from database"""
        try:
            from database import SessionLocal
            from models import Setting
            
            db = SessionLocal()
            try:
                token_setting = db.query(Setting).filter(Setting.key == 'TELEGRAM_BOT_TOKEN').first()
                chat_id_setting = db.query(Setting).filter(Setting.key == 'TELEGRAM_CHAT_ID').first()
                
                self.bot_token = token_setting.value if token_setting else ''
                self.chat_id = chat_id_setting.value if chat_id_setting else ''
                self.enabled = bool(self.bot_token and self.chat_id)
                
                logger.info(f"✅ Telegram config reloaded: enabled={self.enabled}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to reload Telegram config: {e}")
    
    def test_connection(self) -> dict:
        """Test Telegram bot connection and return status"""
        if not self.bot_token or not self.chat_id:
            return {"success": False, "message": "Missing bot token or chat ID"}
        
        try:
            # Send test message
            message = "✅ <b>Bot Connection Test</b>\n\nYour Polymarket bot is successfully connected to Telegram!"
            result = self.send_message(message)
            
            if result:
                return {"success": True, "message": "Test message sent successfully! Check your Telegram."}
            else:
                return {"success": False, "message": "Failed to send test message. Check your credentials."}
        except Exception as e:
            return {"success": False, "message": f"Error: {str(e)}"}
    
    
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
        liquidity = market.get('liquidity', 0)
        category = market.get('category', 'unknown').capitalize()
        
        # Beautiful formatted message
        message = f"""
🚨🚨🚨 <b>ALERTE MARCHÉ CRITIQUE</b> 🚨🚨🚨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 <b>Marché</b>
<i>{title[:150]}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>Urgence:</b> <code>{urgency_rate}%</code> 🔴 CRITIQUE!
🔥 <b>Snipabilité:</b> <code>{snipe_score:.0f}%</code>
⏰ <b>Temps restant:</b> <code>{days_remaining}</code> jours
💰 <b>Volume:</b> <code>${volume:,.0f}</code>
💧 <b>Liquidité:</b> <code>${liquidity:,.0f}</code>
📁 <b>Catégorie:</b> <code>{category}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 <a href="{url}">📱 Voir sur Polymarket</a>

⚠️ <b>ACTION IMMÉDIATE REQUISE!</b>
Ce marché nécessite votre attention urgente.
"""
        
        return self.send_message(message.strip())
    
    def send_new_market_alert(self, market: Dict) -> bool:
        """Send alert for newly detected high-quality market"""
        snipe_score = market.get('snipe_score', 0) * 100
        urgency_rate = market.get('urgency_rate', 0)
        title = market.get('title', 'Unknown Market')
        url = market.get('url', '')
        
        message = f"""
✨ <b>NOUVEAU MARCHÉ DÉTECTÉ</b> ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 <i>{title[:150]}</i>

🔥 <b>Snipabilité:</b> <code>{snipe_score:.0f}%</code>
⚡ <b>Urgence:</b> <code>{urgency_rate}%</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 <a href="{url}">📱 Voir sur Polymarket</a>
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
        action = 'ACHAT' if side == 'BUY' else 'VENTE'
        
        message = f"""
{emoji}━━━━━━━━━━━━━━━━━━━━━━━━━━━━{emoji}
💰 <b>TRADE EXÉCUTÉ - {action}</b>
{emoji}━━━━━━━━━━━━━━━━━━━━━━━━━━━━{emoji}

📊 <b>Marché:</b>
<i>{market_title[:150]}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 <b>Montant:</b> <code>${amount:.2f}</code>
🎯 <b>Prix:</b> <code>{price:.2f}%</code>
📈 <b>Position:</b> <code>{side}</code>

💡 <b>Raison:</b>
<i>{reason}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 <a href="{market_url}">📱 Voir sur Polymarket</a>

✅ <b>Trade placé avec succès!</b>
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
{emoji}━━━━━━━━━━━━━━━━━━━━━━━━━━━━{emoji}
🎯 <b>SIGNAL DÉTECTÉ - {source_type}</b>
{emoji}━━━━━━━━━━━━━━━━━━━━━━━━━━━━{emoji}

📊 <b>Marché ciblé:</b>
<i>{market_title[:150]}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Source:</b> <code>{source_name}</code>
🔑 <b>Mots-clés:</b> <code>{keywords_str}</code>

📝 <b>Contenu détecté:</b>
<i>{content}...</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 <a href="{market_url}">📱 Voir le marché</a>

⚡ <b>Préparation du trade...</b>
"""
        
        return self.send_message(message.strip())

# Singleton instance
telegram_notifier = TelegramNotifier()
