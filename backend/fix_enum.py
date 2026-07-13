"""Script to add program_activities to reporttype enum"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_enum():
    # First transaction: Add enum value
    async with engine.begin() as conn:
        # Check current enum values
        result = await conn.execute(text("SELECT unnest(enum_range(NULL::reporttype))"))
        current_values = [row[0] for row in result]
        print("Current reporttype enum values:", current_values)
        
        if 'program_activities' not in current_values:
            print("\nAdding 'program_activities' to reporttype enum...")
            await conn.execute(text(
                "ALTER TYPE reporttype ADD VALUE IF NOT EXISTS 'program_activities'"
            ))
            print("✓ Successfully added 'program_activities' to reporttype enum")
            await conn.commit()  # Commit this transaction
        else:
            print("\n✓ 'program_activities' already exists in reporttype enum")
    
    # Second transaction: Verify
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT unnest(enum_range(NULL::reporttype))"))
        final_values = [row[0] for row in result]
        print("\nFinal reporttype enum values:", final_values)

if __name__ == "__main__":
    asyncio.run(fix_enum())
