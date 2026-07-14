import asyncio
import asyncpg

async def check_users():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    users = await conn.fetch('SELECT username, role, account_status FROM users LIMIT 10')
    print('\n=== Users in database ===')
    for u in users:
        print(f"  - {u['username']} ({u['role']}) - Status: {u['account_status']}")
    await conn.close()

asyncio.run(check_users())
