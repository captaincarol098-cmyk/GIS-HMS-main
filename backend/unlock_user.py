import asyncio
import asyncpg

async def unlock_superadmin():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    print("\n=== Unlocking superadmin account ===")
    
    # Reset failed login attempts and unlock
    await conn.execute("""
        UPDATE users 
        SET failed_login_attempts = 0,
            last_failed_login = NULL,
            account_locked_until = NULL
        WHERE username = 'superadmin'
    """)
    
    print("✓ Superadmin account unlocked!")
    print("✓ Failed login attempts reset to 0")
    print("\nYou can now login with:")
    print("  Username: superadmin")
    print("  Password: admin123")
    
    await conn.close()

asyncio.run(unlock_superadmin())
