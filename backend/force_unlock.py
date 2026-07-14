import asyncio
import asyncpg
from datetime import datetime, timezone

async def force_unlock():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    print("\n=== FORCE UNLOCK SUPERADMIN ===")
    
    # Check current user status
    user = await conn.fetchrow("""
        SELECT username, failed_login_attempts, last_failed_login, account_locked_until, account_status
        FROM users 
        WHERE username = 'superadmin'
    """)
    
    if user:
        print(f"Current status:")
        print(f"  Username: {user['username']}")
        print(f"  Failed attempts: {user['failed_login_attempts']}")
        print(f"  Last failed: {user['last_failed_login']}")
        print(f"  Locked until: {user['account_locked_until']}")
        print(f"  Account status: {user['account_status']}")
    
    # Force reset everything
    await conn.execute("""
        UPDATE users 
        SET failed_login_attempts = 0,
            last_failed_login = NULL,
            account_locked_until = NULL,
            account_status = 'active'
        WHERE username = 'superadmin'
    """)
    
    # Clear any security alerts for this user
    await conn.execute("""
        UPDATE security_alerts 
        SET is_resolved = true,
            resolved_at = $1
        WHERE username = 'superadmin' AND is_resolved = false
    """, datetime.now(timezone.utc))
    
    print("\n✅ FORCE UNLOCK COMPLETED!")
    print("✅ Failed login attempts: 0")
    print("✅ Account lock: REMOVED") 
    print("✅ Account status: active")
    print("✅ Security alerts: cleared")
    
    await conn.close()

asyncio.run(force_unlock())