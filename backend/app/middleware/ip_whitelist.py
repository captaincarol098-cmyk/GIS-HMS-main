"""
IP Whitelist Middleware
Restricts API access to local network (192.168.x.x) addresses for security.
Allows localhost/127.0.0.1 for development.
"""

import os
from ipaddress import IPv4Address, IPv4Network, AddressValueError
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce IP whitelist restrictions.
    Only allows requests from:
    - 192.168.0.0/16 (Local network)
    - 127.0.0.1 (Localhost)
    - ::1 (IPv6 localhost)
    """
    
    # Allowed IP ranges (CIDR notation or specific IPs)
    ALLOWED_RANGES = [
        "192.168.0.0/16",      # Local network (192.168.0.0 - 192.168.255.255)
        "127.0.0.1",           # IPv4 localhost
        "::1",                 # IPv6 localhost
        "0.0.0.0",             # For container-to-container communication
    ]
    
    # Endpoints to exclude from IP check (e.g., health checks)
    EXCLUDED_PATHS = [
        "/api/health",
        "/docs",
        "/openapi.json",
        "/redoc",
    ]
    
    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled
        
        # Can override with environment variable
        env_enabled = os.getenv("IP_RESTRICTION_ENABLED", "true").lower()
        if env_enabled == "false":
            self.enabled = False
    
    async def dispatch(self, request: Request, call_next):
        # Skip IP check if middleware is disabled
        if not self.enabled:
            return await call_next(request)
        
        # Skip IP check for excluded paths
        if any(request.url.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Log the client IP for debugging
        import sys
        print(f"[IP Whitelist] Client IP: {client_ip}, Path: {request.url.path}", file=sys.stderr)
        
        # Check if IP is allowed
        if not self._is_ip_allowed(client_ip):
            response = JSONResponse(
                status_code=403,
                content={
                    "detail": f"Access denied: Your IP address ({client_ip}) is not authorized to access this service. "
                             f"Only local network addresses (192.168.x.x) are allowed."
                }
            )
            # Add CORS headers to error response so browser doesn't block it
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        
        # IP is allowed, continue
        response = await call_next(request)
        return response
    
    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """
        Extract client IP from request.
        Checks X-Forwarded-For header first (for proxied requests),
        then falls back to request.client.host
        """
        # Check for X-Forwarded-For header (proxy scenarios)
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # X-Forwarded-For can contain multiple IPs, use the first one
            client_ip = x_forwarded_for.split(",")[0].strip()
            return client_ip
        
        # Fallback to request.client.host
        if request.client:
            return request.client.host
        
        return "unknown"
    
    @staticmethod
    def _is_ip_allowed(client_ip: str) -> bool:
        """
        Check if client IP is in the whitelist.
        
        Args:
            client_ip: IP address to check
            
        Returns:
            True if IP is allowed, False otherwise
        """
        if not client_ip or client_ip == "unknown":
            return False
        
        try:
            ip_obj = IPv4Address(client_ip)
            
            for allowed in IPWhitelistMiddleware.ALLOWED_RANGES:
                try:
                    # Check if it's a CIDR range
                    if "/" in allowed:
                        allowed_network = IPv4Network(allowed, strict=False)
                        if ip_obj in allowed_network:
                            return True
                    # Check if it's a specific IP
                    else:
                        allowed_ip = IPv4Address(allowed)
                        if ip_obj == allowed_ip:
                            return True
                except (AddressValueError, ValueError):
                    # Invalid IP in whitelist, skip it
                    continue
            
            return False
        
        except (AddressValueError, ValueError):
            # Invalid IP format
            return False


def get_ip_whitelist_middleware():
    """
    Factory function to create IP whitelist middleware instance.
    Can be configured via environment variables.
    """
    enabled = os.getenv("IP_RESTRICTION_ENABLED", "true").lower() == "true"
    return IPWhitelistMiddleware(enabled=enabled)
