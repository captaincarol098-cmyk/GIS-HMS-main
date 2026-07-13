"""
Quick migration script to add new program fields
Run: python run_migration.py
"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    async with engine.begin() as conn:
        # Add new columns
        await conn.execute(text("""
            ALTER TABLE nutrition_programs 
            ADD COLUMN IF NOT EXISTS program_type VARCHAR(50) DEFAULT 'Other'
        """))
        
        await conn.execute(text("""
            ALTER TABLE nutrition_programs 
            ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'City Funded Program'
        """))
        
        await conn.execute(text("""
            ALTER TABLE nutrition_programs 
            ADD COLUMN IF NOT EXISTS ai_recommended_budget FLOAT
        """))
        
        await conn.execute(text("""
            ALTER TABLE nutrition_programs 
            ADD COLUMN IF NOT EXISTS ai_recommendation_notes TEXT
        """))
        
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
