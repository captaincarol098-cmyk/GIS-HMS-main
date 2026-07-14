import asyncio
import asyncpg

async def check_superadmin():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    # Check for super admins
    superadmins = await conn.fetch("SELECT username, role, account_status FROM users WHERE role = 'super_admin'")
    
    print('\n=== Super Admins ===')
    if superadmins:
        for u in superadmins:
            print(f"  ✓ {u['username']} - Status: {u['account_status']}")
    else:
        print("  ✗ No super admin found!")
        print("\n  Creating default super admin...")
        
        # Create default super admin
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash("admin123")
        
        await conn.execute("""
            INSERT INTO users (username, password_hash, full_name, role, account_status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO NOTHING
        """, "superadmin", hashed_password, "Super Administrator", "super_admin", "active")
        
        print("  ✓ Super admin created!")
        print("  Username: superadmin")
        print("  Password: admin123")
    
    await conn.close()

asyncio.run(check_superadmin())
