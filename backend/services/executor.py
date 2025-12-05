"""
Trade Executor with Intelligent Decision Algorithm
Paper Trading Mode - No real money involved
"""
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
import re
from services.portfolio import portfolio_manager

logger = logging.getLogger(__name__)

# Configuration
EXECUTOR_CONFIG = {
    # Decision thresholds
    'min_confidence': 0.50,
    'high_confidence': 0.80,
    'medium_confidence': 0.65,
    
    # Position sizing
    'min_bet': 10.0,
    'max_bet_pct': 0.05,
    'base_bet_pct': 0.02,
    
    # Limits
    'max_trades_per_day': 20,
    'max_open_positions': 10,
    
    # Weights
    'signal_quality_weight': 0.60,
    'market_quality_weight': 0.40,
    
    # Mode
    'paper_trading': True,  # Always True for now
}

class TradeExecutor:
    def __init__(self):
        self.trades_today = 0
        self.last_reset_date = datetime.utcnow().date()
        logger.info("🤖 Trade Executor initialized (PAPER TRADING MODE)")
    
    def _reset_daily_counter(self):
        """Reset daily trade counter if new day."""
        today = datetime.utcnow().date()
        if today > self.last_reset_date:
            self.trades_today = 0
            self.last_reset_date = today
            logger.info("🔄 Daily trade counter reset")
    
    def _assess_source_reliability(self, signal: Dict) -> float:
        """
        Assess reliability of signal source (0-1).
        
        - Direct tweet from person: 1.0
        - RT/mention: 0.8
        - Major news source: 0.7
        - Minor news: 0.5
        """
        source = signal.get('source', '').lower()
        author = signal.get('author', '').lower()
        
        if source == 'twitter':
            # Check if direct tweet from tracked person
            important_handles = ['realdonaldtrump', 'elonmusk', 'joebiden']
            if any(handle in author for handle in important_handles):
                return 1.0
            return 0.8  # Retweet or mention
        
        elif source == 'rss':
            # Check news source quality
            url = signal.get('url', '').lower()
            major_sources = ['reuters', 'bloomberg', 'ap', 'cnn', 'bbc']
            if any(src in url for src in major_sources):
                return 0.7
            return 0.5
        
        return 0.3
    
    def _assess_keyword_match(self, signal: Dict, market: Dict) -> float:
        """
        Assess how well signal matches market keywords (0-1).
        
        - Exact phrase match: 1.0
        - All keywords match: 0.9
        - 75% match: 0.7
        - 50% match: 0.5
        - Partial: 0.3
        """
        content = signal.get('content', '').lower()
        title = market.get('title', '').lower()
        
        # Extract quoted text from market title
        quotes = re.findall(r'"([^"]*)"', title)
        if quotes:
            # Check for exact quote match
            for quote in quotes:
                if quote.lower() in content:
                    return 1.0
        
        # Extract keywords from market title
        keywords = signal.get('keywords_matched', [])
        if not keywords:
            # Try to extract from title
            words = re.findall(r'\b\w{4,}\b', title)  # Words 4+ chars
            keywords = [w for w in words if w not in ['will', 'before', 'say']]
        
        if not keywords:
            return 0.5
        
        # Count matches
        matches = sum(1 for kw in keywords if kw.lower() in content)
        match_rate = matches / len(keywords) if keywords else 0
        
        if match_rate >= 1.0:
            return 0.9
        elif match_rate >= 0.75:
            return 0.7
        elif match_rate >= 0.5:
            return 0.5
        else:
            return 0.3
    
    def _assess_timing(self, signal: Dict) -> float:
        """
        Assess timing/freshness of signal (0-1).
        
        - < 10 seconds: 1.0
        - < 1 minute: 0.9
        - < 5 minutes: 0.7
        - < 15 minutes: 0.5
        - Older: 0.2
        """
        timestamp_str = signal.get('timestamp')
        if not timestamp_str:
            return 0.5
        
        try:
            signal_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            age = (datetime.now(signal_time.tzinfo) - signal_time).total_seconds()
            
            if age < 10:
                return 1.0
            elif age < 60:
                return 0.9
            elif age < 300:  # 5 min
                return 0.7
            elif age < 900:  # 15 min
                return 0.5
            else:
                return 0.2
        except:
            return 0.5
    
    def _assess_content_clarity(self, signal: Dict, market: Dict) -> float:
        """
        Assess clarity of signal content (0-1).
        
        - Direct quote: 1.0
        - Clear statement: 0.8
        - Contextual: 0.5
        - Vague: 0.3
        """
        content = signal.get('content', '').lower()
        title = market.get('title', '').lower()
        
        # Check for quotes in content
        if '"' in content or "'" in content:
            return 1.0
        
        # Check for clear action words
        action_words = ['announce', 'declare', 'confirm', 'reveal']
        if any(word in content for word in action_words):
            return 0.8
        
        # Check for ambiguous language
        ambiguous = ['maybe', 'possibly', 'might', 'could']
        if any(word in content for word in ambiguous):
            return 0.3
        
        return 0.5
    
    def calculate_signal_quality(self, signal: Dict, market: Dict) -> float:
        """
        Calculate overall signal quality score (0-1).
        
        Components:
        - Source reliability (40%)
        - Keyword match strength (30%)
        - Timing (20%)
        - Content clarity (10%)
        """
        source_reliability = self._assess_source_reliability(signal)
        keyword_match = self._assess_keyword_match(signal, market)
        timing = self._assess_timing(signal)
        clarity = self._assess_content_clarity(signal, market)
        
        signal_quality = (
            source_reliability * 0.40 +
            keyword_match * 0.30 +
            timing * 0.20 +
            clarity * 0.10
        )
        
        logger.debug(f"Signal quality: {signal_quality:.2f} (src:{source_reliability:.2f} kw:{keyword_match:.2f} time:{timing:.2f} clarity:{clarity:.2f})")
        return round(signal_quality, 2)
    
    def calculate_market_quality(self, market: Dict) -> float:
        """
        Calculate market quality score (0-1).
        
        Components:
        - Snipe score (50%)
        - Volume score (20%)
        - Liquidity score (20%)
        - Urgency score (10%)
        """
        snipe_score = market.get('snipe_score', 0)
        volume = market.get('volume', 0)
        liquidity = market.get('liquidity', 0)
        days_remaining = market.get('days_remaining', 365)
        
        # Volume score
        if volume >= 100000:
            volume_score = 1.0
        elif volume >= 50000:
            volume_score = 0.8
        elif volume >= 10000:
            volume_score = 0.6
        elif volume >= 5000:
            volume_score = 0.4
        else:
            volume_score = 0.2
        
        # Liquidity score
        if liquidity >= 50000:
            liquidity_score = 1.0
        elif liquidity >= 20000:
            liquidity_score = 0.8
        elif liquidity >= 5000:
            liquidity_score = 0.6
        elif liquidity >= 1000:
            liquidity_score = 0.4
        else:
            liquidity_score = 0.2
        
        # Urgency score
        if days_remaining is None or days_remaining <= 0:
            urgency_score = 0
        elif days_remaining <= 1:
            urgency_score = 1.0
        elif days_remaining <= 7:
            urgency_score = 0.9
        elif days_remaining <= 30:
            urgency_score = 0.7
        elif days_remaining <= 90:
            urgency_score = 0.5
        else:
            urgency_score = 0.2
        
        market_quality = (
            snipe_score * 0.50 +
            volume_score * 0.20 +
            liquidity_score * 0.20 +
            urgency_score * 0.10
        )
        
        logger.debug(f"Market quality: {market_quality:.2f} (snipe:{snipe_score:.2f} vol:{volume_score:.2f} liq:{liquidity_score:.2f} urg:{urgency_score:.2f})")
        return round(market_quality, 2)
    
    def calculate_confidence(self, signal_quality: float, market_quality: float) -> float:
        """
        Calculate overall confidence score.
        
        confidence = signal_quality * 0.60 + market_quality * 0.40
        """
        confidence = (
            signal_quality * EXECUTOR_CONFIG['signal_quality_weight'] +
            market_quality * EXECUTOR_CONFIG['market_quality_weight']
        )
        return round(confidence, 2)
    
    def determine_side(self, signal: Dict, market: Dict) -> str:
        """
        Determine which side to bet (YES or NO).
        
        For most markets:
        - If signal detected = YES (event happened)
        - If signal indicates opposite = NO
        """
        # For now, simple logic: if signal matches, assume YES
        # Can be enhanced with sentiment analysis
        
        title = market.get('title', '').lower()
        content = signal.get('content', '').lower()
        
        # Negative keywords
        negative = ['not', "didn't", "won't", 'never', 'denies', 'rejects']
        has_negative = any(neg in content for neg in negative)
        
        if has_negative:
            return 'NO'
        else:
            return 'YES'
    
    def should_execute(self, signal: Dict, market: Dict) -> Tuple[bool, str, Dict]:
        """
        Decide whether to execute a trade.
        
        Returns:
            (should_execute, reason, details)
        """
        self._reset_daily_counter()
        
        # Calculate scores
        signal_quality = self.calculate_signal_quality(signal, market)
        market_quality = self.calculate_market_quality(market)
        confidence = self.calculate_confidence(signal_quality, market_quality)
        
        details = {
            'signal_quality': signal_quality,
            'market_quality': market_quality,
            'confidence': confidence
        }
        
        # Check disqualifying filters
        if market.get('volume', 0) < 5000:
            return False, "Volume < $5K", details
        
        if signal_quality < 0.40:
            return False, f"Signal quality too low ({signal_quality:.0%})", details
        
        if market.get('days_remaining', 0) <= 0:
            return False, "Market expired", details
        
        if self.trades_today >= EXECUTOR_CONFIG['max_trades_per_day']:
            return False, f"Daily limit reached ({self.trades_today})", details
        
        # Check confidence threshold
        if confidence < EXECUTOR_CONFIG['min_confidence']:
            return False, f"Confidence too low ({confidence:.0%})", details
        
        # Calculate position size
        position_size = portfolio_manager.calculate_position_size(confidence)
        
        if not portfolio_manager.can_trade(position_size):
            return False, "Insufficient balance", details
        
        # All checks passed
        details['position_size'] = position_size
        return True, f"Confidence: {confidence:.0%}", details
    
    def execute_trade(self, signal: Dict, market: Dict) -> Optional[Dict]:
        """
        Execute a paper trade.
        
        Returns:
            Trade details if executed, None otherwise
        """
        should_exec, reason, details = self.should_execute(signal, market)
        
        if not should_exec:
            logger.info(f"⏭️ SKIP: {market['title'][:50]}... - {reason}")
            return None
        
        # Determine side
        side = self.determine_side(signal, market)
        
        # Get position size
        position_size = details['position_size']
        confidence = details['confidence']
        
        # Open position
        success = portfolio_manager.open_position(
            market_id=market['id'],
            side=side,
            size=position_size,
            confidence=confidence
        )
        
        if not success:
            logger.error("❌ Failed to open position")
            return None
        
        self.trades_today += 1
        
        # Create trade record
        trade_record = {
            'market_id': market['id'],
            'market_title': market['title'],
            'side': side,
            'size': position_size,
            'confidence': confidence,
            'signal_quality': details['signal_quality'],
            'market_quality': details['market_quality'],
            'signal_source': signal.get('source'),
            'signal_content': signal.get('content', '')[:200],
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'OPEN'
        }
        
        logger.info(f"🎯 EXECUTE: {market['title'][:50]}... | {side} ${position_size:.2f} @ {confidence:.0%}")
        
        return trade_record

# Singleton instance
trade_executor = TradeExecutor()
