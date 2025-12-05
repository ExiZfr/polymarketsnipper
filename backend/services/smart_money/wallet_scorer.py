"""
Wallet Scorer - Calculate and maintain wallet performance scores
Criteria: Success Rate (40%) + ROI Adjusted (30%) + Timing (30%)
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import redis.asyncio as redis
from sqlalchemy.orm import Session
from models import WalletScore

logger = logging.getLogger(__name__)

class WalletScorer:
    """
    Evaluates wallet performance and assigns grades (A, B, C, D).
    Higher grades indicate better sniping potential.
    """
    
    def __init__(self, redis_url: str = "redis://redis:6379"):
        """
        Initialize wallet scorer.
        
        Args:
            redis_url: Redis connection URL for caching
        """
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Establish Redis connection for caching."""
        try:
            self.redis_client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("✅ Wallet Scorer connected to Redis")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
    
    def calculate_score(
        self,
        wallet_address: str,
        historical_trades: List[Dict]
    ) -> Tuple[str, Dict]:
        """
        Calculate comprehensive score for a wallet.
        
        Args:
            wallet_address: Wallet address to score
            historical_trades: List of historical trades with outcomes
                Each trade should have: {
                    'outcome': 'WIN' or 'LOSS',
                    'profit': float,
                    'bet_size': float,
                    'time_to_move': float (seconds until significant price move),
                    'market_duration': float (total market duration in seconds)
                }
        
        Returns:
            Tuple of (grade, breakdown dict)
        """
        if not historical_trades:
            return ('D', {
                'success_rate': 0.0,
                'roi_adjusted': 0.0,
                'timing_score': 0.0,
                'final_score': 0.0
            })
        
        # 1. SUCCESS RATE (40% weight)
        wins = sum(1 for t in historical_trades if t.get('outcome') == 'WIN')
        losses = sum(1 for t in historical_trades if t.get('outcome') == 'LOSS')
        total_markets = wins + losses
        
        success_rate = wins / total_markets if total_markets > 0 else 0.0
        
        # 2. ROI ADJUSTED (30% weight)
        total_profit = sum(t.get('profit', 0) for t in historical_trades)
        total_invested = sum(abs(t.get('bet_size', 0)) for t in historical_trades)
        avg_bet_size = total_invested / len(historical_trades) if historical_trades else 1
        
        roi = total_profit / total_invested if total_invested > 0 else 0.0
        risk_adjusted_roi = roi / (avg_bet_size / 1000)  # Normalize to $1000 units
        
        # Clamp ROI to reasonable range (-2 to 5)
        risk_adjusted_roi = max(-2.0, min(5.0, risk_adjusted_roi))
        
        # 3. TIMING SCORE (30% weight) - CRITICAL FOR SNIPING
        timing_entries = [
            t for t in historical_trades 
            if 'time_to_move' in t and 'market_duration' in t
        ]
        
        if timing_entries:
            # Faster entry = higher score
            avg_entry_timing = sum(
                t['time_to_move'] for t in timing_entries
            ) / len(timing_entries)
            
            avg_market_duration = sum(
                t['market_duration'] for t in timing_entries
            ) / len(timing_entries)
            
            # Score: 1.0 = instant, 0.0 = waited full duration
            timing_score = 1.0 - (avg_entry_timing / avg_market_duration)
            timing_score = max(0.0, min(1.0, timing_score))
        else:
            timing_score = 0.5  # Neutral if no timing data
            avg_entry_timing = None
        
        # FINAL SCORE CALCULATION
        final_score = (
            success_rate * 0.4 +
            (risk_adjusted_roi + 1) / 6 * 0.3 +  # Normalize ROI to 0-1
            timing_score * 0.3
        )
        
        # Assign grade
        grade = self._assign_grade(final_score)
        
        breakdown = {
            'success_rate': round(success_rate, 4),
            'roi_adjusted': round(risk_adjusted_roi, 4),
            'timing_score': round(timing_score, 4),
            'final_score': round(final_score, 4),
            'total_markets': total_markets,
            'total_volume': round(total_invested, 2),
            'avg_entry_timing': avg_entry_timing
        }
        
        logger.info(
            f"📊 Wallet {wallet_address[:8]}... scored: {grade} "
            f"(Final: {final_score:.2f}, SR: {success_rate:.1%}, "
            f"ROI: {risk_adjusted_roi:.2f}, Timing: {timing_score:.1%})"
        )
        
        return (grade, breakdown)
    
    def _assign_grade(self, final_score: float) -> str:
        """
        Assign letter grade based on final score.
        
        A: Top performers (80%+)
        B: Strong performers (60-80%)
        C: Average (40-60%)
        D: Below average (<40%)
        """
        if final_score >= 0.80:
            return 'A'
        elif final_score >= 0.60:
            return 'B'
        elif final_score >= 0.40:
            return 'C'
        else:
            return 'D'
    
    async def update_wallet_score(
        self,
        wallet_address: str,
        historical_trades: List[Dict],
        db: Session
    ) -> WalletScore:
        """
        Calculate and persist wallet score to database.
        Also cache in Redis for fast lookups.
        
        Args:
            wallet_address: Wallet to score
            historical_trades: Historical trade data
            db: Database session
        
        Returns:
            Updated WalletScore model
        """
        grade, breakdown = self.calculate_score(wallet_address, historical_trades)
        
        # Update or create in database
        wallet_score = db.query(WalletScore).filter(
            WalletScore.wallet_address == wallet_address
        ).first()
        
        if not wallet_score:
            wallet_score = WalletScore(wallet_address=wallet_address)
        
        wallet_score.score_grade = grade
        wallet_score.success_rate = breakdown['success_rate']
        wallet_score.roi_adjusted = breakdown['roi_adjusted']
        wallet_score.timing_score = breakdown['timing_score']
        wallet_score.total_markets = breakdown['total_markets']
        wallet_score.total_volume = breakdown['total_volume']
        wallet_score.avg_entry_timing = breakdown.get('avg_entry_timing')
        wallet_score.last_updated = datetime.utcnow()
        
        db.add(wallet_score)
        db.commit()
        db.refresh(wallet_score)
        
        # Cache in Redis (TTL 1 hour)
        if self.redis_client:
            await self.redis_client.setex(
                f"wallet_score:{wallet_address}",
                3600,  # 1 hour TTL
                grade
            )
        
        return wallet_score
    
    async def get_wallet_grade(
        self,
        wallet_address: str,
        db: Optional[Session] = None
    ) -> str:
        """
        Get wallet grade from cache or database.
        
        Args:
            wallet_address: Wallet to lookup
            db: Database session (optional)
        
        Returns:
            Grade (A, B, C, D) or 'UNKNOWN'
        """
        # Try Redis cache first
        if self.redis_client:
            try:
                cached_grade = await self.redis_client.get(
                    f"wallet_score:{wallet_address}"
                )
                if cached_grade:
                    return cached_grade
            except Exception as e:
                logger.warning(f"Redis cache miss: {e}")
        
        # Fallback to database
        if db:
            wallet_score = db.query(WalletScore).filter(
                WalletScore.wallet_address == wallet_address
            ).first()
            
            if wallet_score:
                # Re-cache in Redis
                if self.redis_client:
                    await self.redis_client.setex(
                        f"wallet_score:{wallet_address}",
                        3600,
                        wallet_score.score_grade
                    )
                return wallet_score.score_grade
        
        return 'UNKNOWN'


# Singleton instance
wallet_scorer = WalletScorer()
