import asyncio
import asyncpg

async def fix_reports():
    conn = await asyncpg.connect('postgresql://postgres:11322@localhost:5432/gishms')
    
    print("\n=== Checking Report Issues ===")
    
    # Check current report statuses
    reports = await conn.fetch("""
        SELECT id, title, status, generated_at, submitted_at 
        FROM reports 
        ORDER BY generated_at DESC 
        LIMIT 10
    """)
    
    print("\nRecent reports:")
    for r in reports:
        print(f"  - {r['title'][:50]}... | Status: {r['status']} | Generated: {r['generated_at']}")
    
    # Check for reports that might be stuck
    stuck_reports = await conn.fetch("""
        SELECT id, title, status
        FROM reports 
        WHERE status = 'submitted' AND submitted_at IS NULL
    """)
    
    if stuck_reports:
        print(f"\n⚠️ Found {len(stuck_reports)} reports with 'submitted' status but no submitted_at timestamp!")
        for r in stuck_reports:
            print(f"  - Fixing: {r['title'][:50]}...")
            # Reset to draft so user can resubmit properly
            await conn.execute("""
                UPDATE reports 
                SET status = 'draft', submitted_at = NULL 
                WHERE id = $1
            """, r['id'])
        print("✅ Fixed stuck reports - they are now back to 'draft' status")
    else:
        print("✅ No stuck reports found")
    
    await conn.close()

asyncio.run(fix_reports())