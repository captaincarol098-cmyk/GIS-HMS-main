import asyncio
import asyncpg

async def check_tolosa_sync():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    print('\n=== Tolosa Admin Check ===')
    user = await conn.fetchrow('SELECT username, role, account_status, email FROM users WHERE username = $1', 'admin_tolosa')
    if user:
        print(f'  ✓ admin_tolosa found')
        print(f'    Role: {user["role"]}')
        print(f'    Status: {user["account_status"]}')
        print(f'    Email: {user["email"]}')
    else:
        print('  ✗ admin_tolosa NOT found in database')
    
    print('\n=== Tolosa Barangay Check ===')
    barangay = await conn.fetchrow('SELECT name, code FROM barangays WHERE name ILIKE $1', 'tolosa')
    if barangay:
        print(f'  ✓ Tolosa barangay found')
        print(f'    Name: {barangay["name"]}')
        print(f'    Code: {barangay["code"]}')
    else:
        print('  ✗ Tolosa barangay NOT found in database')
    
    # Get all barangays
    print('\n=== All Barangays ===')
    barangays = await conn.fetch('SELECT name, code FROM barangays ORDER BY name')
    for b in barangays:
        print(f'  - {b["name"]} ({b["code"]})')
    
    await conn.close()

asyncio.run(check_tolosa_sync())
