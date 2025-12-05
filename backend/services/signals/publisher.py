"""
Signal Publisher - Ultra-fast signal distribution via Redis Pub/Sub
Latency target: < 50ms
"""

import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import redis.asyncio as redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SignalPublisher:
    """
    Responsible for publishing snipe signals to Redis Pub/Sub
    and logging them to the database for analysis.
    """
    
    def __init__(self, redis_url: str = "redis://redis:6379"):
        """
        Initialize the signal publisher.
        
        Args:
            redis_url: Redis connection URL
        """
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Establish Redis connection."""
        try:
            self.redis_client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            self._connected = True
            logger.info("✅ Signal Publisher connected to Redis")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            self._connected = False
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            self._connected = False
            logger.info("Signal Publisher disconnected from Redis")
    
    async def emit_signal(
        self,
        signal_type: str,
        market_id: str,
        side: str,
        magnitude: float,
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None
    ) -> bool:
        """
        Publish a snipe signal to Redis and log to database.
        
        Args:
            signal_type: Type of signal (CRITICAL_SNIPE, SMART_MONEY, SPIKE, etc.)
            market_id: Polymarket market ID
            side: YES or NO
            magnitude: Strength of the signal (0-1)
            metadata: Additional data (wallets, order sizes, etc.)
            db: Database session for logging (optional)
        
        Returns:
            True if signal published successfully
        """
        if not self._connected:
            await self.connect()
        
        if not self._connected:
            logger.error("Cannot emit signal: Redis not connected")
            return False
        
        # Prepare signal payload
        signal_data = {
            "signal_type": signal_type,
            "market_id": market_id,
            "side": side,
            "magnitude": magnitude,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        try:
            # 1. Publish to Redis Pub/Sub (ultra-fast, non-blocking)
            start_time = asyncio.get_event_loop().time()
            
            await self.redis_client.publish(
                "snipe_signals",
                json.dumps(signal_data)
            )
            
            latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
            logger.info(
                f"🚀 Signal Published [{signal_type}] "
                f"Market: {market_id[:8]}... Side: {side} "
                f"Magnitude: {magnitude:.2f} "
                f"Latency: {latency_ms:.1f}ms"
            )
            
            # 2. Log to database (async, non-blocking)
            if db:
                asyncio.create_task(self._log_to_db(signal_data, db))
            
            # 3. Store in Redis list for recent signals (keep last 100)
            await self.redis_client.lpush(
                f"signals:{market_id}",
                json.dumps(signal_data)
            )
            await self.redis_client.ltrim(f"signals:{market_id}", 0, 99)
            
            # 4. Send Telegram alert for critical signals
            if signal_type == "CRITICAL_SNIPE":
                asyncio.create_task(self._send_telegram_alert(signal_data))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish signal: {e}")
            return False
    
    async def _log_to_db(self, signal_data: Dict[str, Any], db: Session):
        """
        Log signal to database (async, non-blocking).
        
        Args:
            signal_data: Signal data to log
            db: Database session
        """
        try:
            from models import SnipeSignal  # Import here to avoid circular deps
            
            signal = SnipeSignal(
                market_id=signal_data["market_id"],
                signal_type=signal_data["signal_type"],
                side=signal_data["side"],
                magnitude=signal_data["magnitude"],
                wallets=signal_data.get("metadata", {}).get("wallets", []),
                metadata=signal_data.get("metadata", {})
            )
            
            db.add(signal)
            db.commit()
            logger.debug(f"📝 Signal logged to database: {signal.id}")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to log signal to DB: {e}")
            # Don't raise - DB logging failure shouldn't stop signal emission
    
    async def _send_telegram_alert(self, signal_data: Dict[str, Any]):
        """
        Send Telegram alert for critical signals.
        
        Args:
            signal_data: Signal data to send
        """
        try:
            from services.telegram_notifier import telegram_notifier
            
            message = (
                f"🚨 <b>CRITICAL SNIPE SIGNAL</b>\n\n"
                f"Market: {signal_data['market_id']}\n"
                f"Side: {signal_data['side']}\n"
                f"Magnitude: {signal_data['magnitude']:.1%}\n"
                f"Type: {signal_data['signal_type']}\n"
                f"Time: {signal_data['timestamp']}"
            )
            
            await telegram_notifier.send_message(message, parse_mode="HTML")
            logger.info("📱 Telegram alert sent")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to send Telegram alert: {e}")
    
    async def get_recent_signals(
        self,
        market_id: str,
        limit: int = 10
    ) -> list[Dict[str, Any]]:
        """
        Get recent signals for a market.
        
        Args:
            market_id: Market ID to query
            limit: Max number of signals to return
        
        Returns:
            List of recent signals
        """
        if not self._connected:
            await self.connect()
        
        try:
            signals_json = await self.redis_client.lrange(
                f"signals:{market_id}",
                0,
                limit - 1
            )
            
            return [json.loads(s) for s in signals_json]
            
        except Exception as e:
            logger.error(f"Failed to get recent signals: {e}")
            return []


# Singleton instance
signal_publisher = SignalPublisher()
