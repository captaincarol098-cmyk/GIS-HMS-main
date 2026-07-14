import asyncio
import asyncpg
import os

async def run_migration():
    # Read database connection from environment or use defaults
    db_url = "postgresql://postgres:11322@localhost:5432/gishms"
    
    print(f"Connecting to database...")
    conn = await asyncpg.connect(db_url)
    
    try:
        # Read the migration file
        migration_file = "migrations/add_security_tracking.sql"
        print(f"Reading migration file: {migration_file}")
        
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        print("Executing migration...")
        await conn.execute(sql)
        print("✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        await conn.close()
        print("Database connection closed")

if __name__ == "__main__":
    asyncio.run(run_migration())
