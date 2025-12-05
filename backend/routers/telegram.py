from fastapi import APIRouter, Depends
from routers.auth import get_current_user
from services.telegram_notifier import telegram_notifier

router = APIRouter(prefix="/telegram", tags=["telegram"])

@router.post("/test")
async def test_telegram_connection(current_user = Depends(get_current_user)):
    """Test Telegram bot connection"""
    # Reload config from database first
    telegram_notifier.reload_config()
    result = telegram_notifier.test_connection()
    return result

@router.post("/send-test")
async def send_test_message(current_user = Depends(get_current_user)):
    """Send a test trade notification"""
    telegram_notifier.reload_config()
    test_data = {
        "market_title": "Test Market: Will Trump tweet today?",
        "side": "YES",
        "amount": 10.0,
        "price": 65.5,
        "market_url": "https://polymarket.com",
        "reason": "Test notification from dashboard"
    }
    success = telegram_notifier.send_trade_alert(test_data)
    return {
        "success": success, 
        "message": "Test notification sent! Check your Telegram." if success else "Failed to send notification."
    }
