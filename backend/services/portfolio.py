"""
Portfolio Manager for Paper Trading
Tracks virtual capital and position sizing
"""
import logging
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class PortfolioManager:
    def __init__(self, initial_capital: float = 10000.0):
        """
        Initialize portfolio with virtual capital.
        
        Args:
            initial_capital: Starting capital in USD (default $10,000)
        """
        self.initial_capital = initial_capital
        self.available_balance = initial_capital
        self.positions = {}  # market_id -> position details
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        
        logger.info(f"💰 Portfolio initialized with ${initial_capital:,.2f} virtual capital")
    
    def can_trade(self, bet_size: float) -> bool:
        """Check if we have enough balance for this trade."""
        return self.available_balance >= bet_size
    
    def calculate_position_size(self, 
                                confidence: float, 
                                base_percentage: float = 0.02,
                                min_bet: float = 10.0,
                                max_bet_percentage: float = 0.05) -> float:
        """
        Calculate optimal position size based on confidence.
        
        Args:
            confidence: Confidence score (0-1)
            base_percentage: Base % of capital to risk
            min_bet: Minimum bet size
            max_bet_percentage: Maximum % of capital per trade
        
        Returns:
            Position size in USD
        """
        # Base size
        base_size = self.available_balance * base_percentage
        
        # Scale by confidence (confidence > 0.5 increases size)
        confidence_multiplier = (confidence / 0.5) if confidence > 0.5 else 1.0
        adjusted_size = base_size * confidence_multiplier
        
        # Apply limits
        min_bet_size = min_bet
        max_bet_size = self.available_balance * max_bet_percentage
        
        final_size = max(min_bet_size, min(adjusted_size, max_bet_size))
        
        logger.info(f"📊 Position sizing: confidence={confidence:.2f}, size=${final_size:.2f}")
        return round(final_size, 2)
    
    def open_position(self, market_id: str, side: str, size: float, confidence: float) -> bool:
        """
        Open a new position (paper trading).
        
        Args:
            market_id: Market identifier
            side: 'YES' or 'NO'
            size: Position size in USD
            confidence: Trade confidence
        
        Returns:
            True if position opened successfully
        """
        if not self.can_trade(size):
            logger.warning(f"⚠️ Insufficient balance: ${self.available_balance:.2f} < ${size:.2f}")
            return False
        
        # Reserve capital
        self.available_balance -= size
        
        # Track position
        self.positions[market_id] = {
            'side': side,
            'size': size,
            'confidence': confidence,
            'opened_at': datetime.utcnow(),
            'status': 'OPEN'
        }
        
        self.total_trades += 1
        
        logger.info(f"✅ Position opened: {market_id[:10]}... {side} ${size:.2f} @ {confidence:.0%}")
        return True
    
    def close_position(self, market_id: str, outcome: str, payout: float = None):
        """
        Close a position and record P&L.
        
        Args:
            market_id: Market identifier
            outcome: 'WIN' or 'LOSS'
            payout: Actual payout (if None, calculated)
        """
        if market_id not in self.positions:
            logger.warning(f"Position {market_id} not found")
            return
        
        position = self.positions[market_id]
        
        if payout is None:
            # Simplified: assume 2x return on win, 0x on loss
            payout = position['size'] * 2 if outcome == 'WIN' else 0
        
        # Return capital + profit/loss
        self.available_balance += payout
        
        # Calculate P&L
        profit = payout - position['size']
        self.total_profit += profit
        
        # Update stats
        if outcome == 'WIN':
            self.winning_trades += 1
        else:
            self.losing_trades += 1
        
        # Mark as closed
        position['status'] = 'CLOSED'
        position['outcome'] = outcome
        position['payout'] = payout
        position['profit'] = profit
        position['closed_at'] = datetime.utcnow()
        
        logger.info(f"📈 Position closed: {market_id[:10]}... {outcome} P&L: ${profit:+.2f}")
    
    def get_stats(self) -> Dict:
        """Get current portfolio statistics."""
        total_value = self.available_balance + sum(
            p['size'] for p in self.positions.values() if p['status'] == 'OPEN'
        )
        
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'initial_capital': self.initial_capital,
            'available_balance': round(self.available_balance, 2),
            'total_value': round(total_value, 2),
            'open_positions': len([p for p in self.positions.values() if p['status'] == 'OPEN']),
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': round(win_rate, 1),
            'total_profit': round(self.total_profit, 2),
            'roi': round((total_value - self.initial_capital) / self.initial_capital * 100, 2)
        }
    
    def reset(self):
        """Reset portfolio to initial state."""
        self.available_balance = self.initial_capital
        self.positions = {}
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        logger.info("🔄 Portfolio reset to initial state")

# Singleton instance
portfolio_manager = PortfolioManager(initial_capital=10000.0)
