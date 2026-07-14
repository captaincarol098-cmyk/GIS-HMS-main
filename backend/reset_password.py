import asyncio
import asyncpg
from passlib.context import CryptContext

async def reset_superadmin_password():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    print("\n=== RESET SUPERADMIN PASSWORD ===")
    
    # Create new password hash
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    new_password = "admin123"
    hashed_password = pwd_context.hash(new_password)
    
    # Update password
    await conn.execute("""
        UPDATE users 
        SET password_hash = $1
        WHERE username = 'superadmin'
    """, hashed_password)
    
    print("✅ Password reset completed!")
    print(f"Username: superadmin")
    print(f"Password: {new_password}")
    print("✅ You can now login!")
    
    await conn.close()

asyncio.run(reset_superadmin_password())