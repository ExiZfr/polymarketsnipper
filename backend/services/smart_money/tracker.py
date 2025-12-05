"""
Smart Money Tracker - Detect coordinated entry of high-grade wallets
Signal Trigger: 3+ A/B wallets enter same side within 30 seconds
"""

import asyncio
import logging
import time
from collections import deque, defaultdict
from typing import Dict, List, Optional, Set
from datetime import datetime
import json

from services.smart_money.wallet_scorer import wallet_scorer
from services.signals.publisher import signal_publisher
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SmartMoneyTracker:
    """
    Tracks wallet entries on markets and emits signals when
    multiple high-grade wallets coordinate.
    """
    
    def __init__(self):
        """Initialize smart money tracker."""
        # Store recent entries per market
        # Structure: {market_id: deque of entries}
        self.market_entries: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=100)  # Keep last 100 entries
        )
        
        # Tracking state
        self._active_markets: Set[str] = set()
        
        # Thresholds
        self.MIN_WALLETS = 3  # Minimum wallets to trigger signal
        self.TIME_WINDOW = 30  # seconds
        self.MIN_CUMULATIVE_SIZE = 500  # $500 minimum total size
    
    async def track_market_order(
        self,
        market_id: str,
        wallet_address: str,
        side: str,  # 'YES' or 'NO'
        size: float,  # Order size in USD
        db: Session
    ):
        """
        Process a new order and check for smart money signals.
        
        Args:
            market_id: Polymarket market ID
            wallet_address: Wallet placing order
            side: YES or NO
            size: Order size in USD
            db: Database session
        """
        # Get wallet grade
        grade = await wallet_scorer.get_wallet_grade(wallet_address, db)
        
        # Only track A and B grade wallets
        if grade not in ['A', 'B']:
            return
        
        # Add to recent entries
        entry = {
            'wallet': wallet_address,
            'grade': grade,
            'side': side,
            'size': size,
            'timestamp': time.time()
        }
        
        self.market_entries[market_id].append(entry)
        
        logger.debug(
            f"📝 Smart wallet {grade} entered {side} on {market_id[:8]}... "
            f"Size: ${size:.2f}"
        )
        
        # Check for signal conditions
        await self._check_signal_conditions(market_id, db)
    
    async def _check_signal_conditions(
        self,
        market_id: str,
        db: Session
    ):
        """
        Check if signal conditions are met for a market.
        
        Args:
            market_id: Market to check
            db: Database session
        """
        entries = self.market_entries[market_id]
        now = time.time()
        
        # Filter entries within time window
        recent_entries = [
            e for e in entries
            if now - e['timestamp'] <= self.TIME_WINDOW
        ]
        
        if len(recent_entries) < self.MIN_WALLETS:
            return
        
        # Group by side
        yes_wallets = defaultdict(list)
        no_wallets = defaultdict(list)
        
        for entry in recent_entries:
            wallet = entry['wallet']
            if entry['side'] == 'YES':
                yes_wallets[wallet].append(entry)
            else:
                no_wallets[wallet].append(entry)
        
        # Check YES side
        if len(yes_wallets) >= self.MIN_WALLETS:
            total_size = sum(
                e['size'] for entries in yes_wallets.values() for e in entries
            )
            if total_size >= self.MIN_CUMULATIVE_SIZE:
                await self._emit_smart_money_signal(
                    market_id,
                    'YES',
                    yes_wallets,
                    total_size,
                    db
                )
        
        # Check NO side
        if len(no_wallets) >= self.MIN_WALLETS:
            total_size = sum(
                e['size'] for entries in no_wallets.values() for e in entries
            )
            if total_size >= self.MIN_CUMULATIVE_SIZE:
                await self._emit_smart_money_signal(
                    market_id,
                    'NO',
                    no_wallets,
                    total_size,
                    db
                )
    
    async def _emit_smart_money_signal(
        self,
        market_id: str,
        side: str,
        wallets: Dict[str, List[Dict]],
        total_size: float,
        db: Session
    ):
        """
        Emit smart money signal.
        
        Args:
            market_id: Market ID
            side: YES or NO
            wallets: Dict of {wallet_address: [entries]}
            total_size: Total cumulative size
            db: Database session
        """
        wallet_list = list(wallets.keys())
        
        # Calculate magnitude (0-1)
        # More wallets + larger size = higher magnitude
        num_wallets = len(wallet_list)
        magnitude = min(1.0, (num_wallets / 10) * 0.7 + (total_size / 5000) * 0.3)
        
        # Calculate average grade score
        grade_scores = {'A': 1.0, 'B': 0.75, 'C': 0.5, 'D': 0.25}
        avg_grade_score = sum(
            grade_scores.get(e['grade'], 0.5)
            for entries in wallets.values()
            for e in entries
        ) / sum(len(entries) for entries in wallets.values())
        
        # Adjust magnitude by grade quality
        magnitude *= avg_grade_score
        
        metadata = {
            'wallets': wallet_list,
            'num_wallets': num_wallets,
            'total_size': total_size,
            'avg_grade': avg_grade_score,
            'wallet_details': {
                wallet: {
                    'grade': entries[0]['grade'],
                    'total_size': sum(e['size'] for e in entries),
                    'num_orders': len(entries)
                }
                for wallet, entries in wallets.items()
            }
        }
        
        logger.info(
            f"🎯 SMART MONEY SIGNAL: {num_wallets} wallets → {side} "
            f"on {market_id[:8]}... (${total_size:.2f}, mag: {magnitude:.2f})"
        )
        
        # Emit via signal publisher
        await signal_publisher.emit_signal(
            signal_type='SMART_MONEY',
            market_id=market_id,
            side=side,
            magnitude=magnitude,
            metadata=metadata,
            db=db
        )
    
    async def start_tracking(self, market_id: str):
        """
        Start tracking a market.
        
        Args:
            market_id: Market to track
        """
        self._active_markets.add(market_id)
        logger.info(f"👁️ Started tracking market {market_id[:8]}...")
    
    async def stop_tracking(self, market_id: str):
        """
        Stop tracking a market and clear its data.
        
        Args:
            market_id: Market to stop tracking
        """
        if market_id in self._active_markets:
            self._active_markets.remove(market_id)
        
        if market_id in self.market_entries:
            del self.market_entries[market_id]
        
        logger.info(f"⏸️ Stopped tracking market {market_id[:8]}...")
    
    def clear_old_entries(self, max_age_seconds: int = 300):
        """
        Clear entries older than max_age_seconds from all markets.
        
        Args:
            max_age_seconds: Maximum age in seconds (default 5 minutes)
        """
        now = time.time()
        cutoff = now - max_age_seconds
        
        for market_id, entries in list(self.market_entries.items()):
            # Filter out old entries
            self.market_entries[market_id] = deque(
                (e for e in entries if e['timestamp'] >= cutoff),
                maxlen=100
            )
            
            # Remove empty markets
            if len(self.market_entries[market_id]) == 0:
                del self.market_entries[market_id]


# Singleton instance
smart_money_tracker = SmartMoneyTracker()
