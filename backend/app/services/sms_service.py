"""
SMS Service - Send text messages via Semaphore or Twilio
Supports Philippine mobile networks (Globe, Smart, Sun, TM)
"""
import os
import requests
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SMSService:
    """Unified SMS service supporting multiple providers"""
    
    def __init__(self):
        self.enabled = os.getenv("SMS_ENABLED", "false").lower() == "true"
        self.provider = os.getenv("SMS_PROVIDER", "semaphore").lower()
        self.test_mode = os.getenv("SMS_TEST_MODE", "false").lower() == "true"
        
        # Semaphore config (Philippine SMS provider)
        self.semaphore_api_key = os.getenv("SEMAPHORE_API_KEY", "")
        self.semaphore_sender = os.getenv("SEMAPHORE_SENDER_NAME", "GIS-HMS")
        
        # Twilio config (International provider)
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_number = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    def send_sms(
        self,
        phone_number: str,
        message: str,
        priority: str = "normal"
    ) -> dict:
        """
        Send SMS via configured provider
        
        Args:
            phone_number: Philippine mobile number (09xxxxxxxxx or +639xxxxxxxxx)
            message: SMS content (max 160 chars for single SMS)
            priority: "normal" or "urgent"
        
        Returns:
            {
                "success": bool,
                "message_id": str,
                "error": str (if failed),
                "provider": str
            }
        """
        if not self.enabled:
            logger.info(f"SMS disabled. Would send to {phone_number}: {message}")
            return {"success": False, "error": "SMS service is disabled"}
        
        if self.test_mode:
            logger.info(f"[TEST MODE] SMS to {phone_number}: {message}")
            return {
                "success": True,
                "message_id": f"test_{datetime.now().timestamp()}",
                "test_mode": True,
                "provider": self.provider
            }
        
        # Normalize phone number to +639xxxxxxxxx format
        normalized_number = self._normalize_phone(phone_number)
        
        if not normalized_number:
            return {"success": False, "error": "Invalid phone number format"}
        
        # Send via configured provider
        if self.provider == "semaphore":
            return self._send_via_semaphore(normalized_number, message)
        elif self.provider == "twilio":
            return self._send_via_twilio(normalized_number, message)
        else:
            return {"success": False, "error": f"Unknown provider: {self.provider}"}
    
    def _normalize_phone(self, phone: str) -> Optional[str]:
        """
        Normalize Philippine phone number to +639xxxxxxxxx format
        
        Supported input formats:
        - 09171234567 → +639171234567
        - 9171234567 → +639171234567
        - +639171234567 → +639171234567
        - 639171234567 → +639171234567
        """
        if not phone:
            return None
        
        # Remove spaces, dashes, parentheses
        clean = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Handle different formats
        if clean.startswith("+63"):
            return clean if len(clean) == 13 else None
        elif clean.startswith("63"):
            return f"+{clean}" if len(clean) == 12 else None
        elif clean.startswith("0"):
            return f"+63{clean[1:]}" if len(clean) == 11 else None
        elif clean.startswith("9"):
            return f"+63{clean}" if len(clean) == 10 else None
        else:
            logger.warning(f"Unusual phone format: {phone}")
            return None
    
    def _send_via_semaphore(self, phone: str, message: str) -> dict:
        """
        Send SMS via Semaphore API (Philippine provider)
        
        API Documentation: https://semaphore.co/docs
        """
        if not self.semaphore_api_key:
            return {"success": False, "error": "Semaphore API key not configured"}
        
        try:
            url = "https://api.semaphore.co/api/v4/messages"
            
            payload = {
                "apikey": self.semaphore_api_key,
                "number": phone,
                "message": message,
                "sendername": self.semaphore_sender
            }
            
            logger.info(f"Sending SMS via Semaphore to {phone}")
            response = requests.post(url, data=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            # Check response format
            # Semaphore returns: {"message_id": 123456, "status": "success", ...}
            if result.get("message_id"):
                logger.info(f"SMS sent successfully via Semaphore. ID: {result.get('message_id')}")
                return {
                    "success": True,
                    "message_id": str(result.get("message_id")),
                    "provider": "semaphore"
                }
            else:
                error_msg = result.get("message", "Unknown error")
                logger.error(f"Semaphore error: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "provider": "semaphore"
                }
        
        except requests.RequestException as e:
            logger.error(f"Semaphore API error: {e}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}",
                "provider": "semaphore"
            }
        except Exception as e:
            logger.error(f"Unexpected error sending via Semaphore: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "semaphore"
            }
    
    def _send_via_twilio(self, phone: str, message: str) -> dict:
        """
        Send SMS via Twilio API (International provider)
        
        Note: Requires twilio package: pip install twilio
        """
        if not self.twilio_sid or not self.twilio_token:
            return {"success": False, "error": "Twilio credentials not configured"}
        
        try:
            from twilio.rest import Client
            
            client = Client(self.twilio_sid, self.twilio_token)
            
            logger.info(f"Sending SMS via Twilio to {phone}")
            msg = client.messages.create(
                body=message,
                from_=self.twilio_number,
                to=phone
            )
            
            logger.info(f"SMS sent successfully via Twilio. SID: {msg.sid}")
            return {
                "success": True,
                "message_id": msg.sid,
                "provider": "twilio"
            }
        
        except ImportError:
            logger.error("Twilio package not installed. Run: pip install twilio")
            return {
                "success": False,
                "error": "Twilio package not installed",
                "provider": "twilio"
            }
        except Exception as e:
            logger.error(f"Twilio API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "twilio"
            }
    
    def send_bulk_sms(self, recipients: list[dict]) -> dict:
        """
        Send SMS to multiple recipients
        
        Args:
            recipients: [
                {"phone": "09171234567", "message": "Hello"},
                {"phone": "09181234567", "message": "Hi", "priority": "urgent"}
            ]
        
        Returns:
            {
                "total": 2,
                "success": 1,
                "failed": 1,
                "results": [
                    {"phone": "09171234567", "success": True, "message_id": "123"},
                    {"phone": "09181234567", "success": False, "error": "..."}
                ]
            }
        """
        results = []
        success_count = 0
        failed_count = 0
        
        for recipient in recipients:
            phone = recipient.get("phone", "")
            message = recipient.get("message", "")
            priority = recipient.get("priority", "normal")
            
            if not phone or not message:
                results.append({
                    "phone": phone,
                    "success": False,
                    "error": "Missing phone or message"
                })
                failed_count += 1
                continue
            
            result = self.send_sms(phone, message, priority)
            results.append({
                "phone": phone,
                **result
            })
            
            if result.get("success"):
                success_count += 1
            else:
                failed_count += 1
        
        return {
            "total": len(recipients),
            "success": success_count,
            "failed": failed_count,
            "results": results
        }
    
    def validate_phone(self, phone: str) -> dict:
        """
        Validate phone number format without sending SMS
        
        Returns:
            {
                "valid": bool,
                "normalized": str,
                "error": str (if invalid)
            }
        """
        normalized = self._normalize_phone(phone)
        
        if normalized:
            return {
                "valid": True,
                "normalized": normalized,
                "format": "Philippine mobile number"
            }
        else:
            return {
                "valid": False,
                "error": "Invalid phone number format. Use: 09171234567 or +639171234567"
            }


# Singleton instance
sms_service = SMSService()


# Convenience functions for easy import
def send_sms(phone: str, message: str, priority: str = "normal") -> dict:
    """Send a single SMS"""
    return sms_service.send_sms(phone, message, priority)


def send_bulk_sms(recipients: list[dict]) -> dict:
    """Send SMS to multiple recipients"""
    return sms_service.send_bulk_sms(recipients)


def validate_phone(phone: str) -> dict:
    """Validate phone number format"""
    return sms_service.validate_phone(phone)
