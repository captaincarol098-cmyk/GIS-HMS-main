#!/usr/bin/env python3
"""
Quick database checker to see if 2025 data exists
"""
import sys
sys.path.insert(0, 'backend')

import asyncio
from sqlalchemy import text
from app.config import get_settings
from app.database import AsyncSessionLocal

async def check_data():
    settings = get_settings()
    print(f"Database URL: {settings.database_url}\n")
    
    async with AsyncSessionLocal() as session:
        try:
            # Check measurements by year
            print("=" * 60)
            print("MEASUREMENTS BY YEAR:")
            print("=" * 60)
            result = await session.execute(text(
                "SELECT YEAR(measurement_date) as year, COUNT(*) as count FROM measurements GROUP BY YEAR(measurement_date) ORDER BY year DESC"
            ))
            rows = result.fetchall()
            if rows:
                for row in rows:
                    print(f"  {row[0]}: {row[1]} records")
            else:
                print("  No measurements found!")
            
            # Check 2025 specifically
            print("\n" + "=" * 60)
            print("2025 DATA DETAILS:")
            print("=" * 60)
            result = await session.execute(text(
                "SELECT COUNT(*) FROM measurements WHERE YEAR(measurement_date) = 2025"
            ))
            count_2025 = result.scalar()
            print(f"  Total measurements in 2025: {count_2025}")
            
            # Check 2026
            result = await session.execute(text(
                "SELECT COUNT(*) FROM measurements WHERE YEAR(measurement_date) = 2026"
            ))
            count_2026 = result.scalar()
            print(f"  Total measurements in 2026: {count_2026}")
            
            # Check latest measurement dates
            print("\n" + "=" * 60)
            print("LATEST MEASUREMENT DATES:")
            print("=" * 60)
            result = await session.execute(text(
                "SELECT DATE(measurement_date) as date, COUNT(*) as count FROM measurements GROUP BY DATE(measurement_date) ORDER BY date DESC LIMIT 10"
            ))
            rows = result.fetchall()
            for row in rows:
                print(f"  {row[0]}: {row[1]} records")
            
            # Check children count
            print("\n" + "=" * 60)
            print("CHILDREN COUNT:")
            print("=" * 60)
            result = await session.execute(text("SELECT COUNT(*) FROM children WHERE is_active = TRUE"))
            total_children = result.scalar()
            print(f"  Total active children: {total_children}")
            
            # Check if measurement_date column exists
            print("\n" + "=" * 60)
            print("MEASUREMENT COLUMNS:")
            print("=" * 60)
            result = await session.execute(text("DESCRIBE measurements"))
            columns = result.fetchall()
            date_columns = [col for col in columns if 'date' in str(col).lower()]
            if date_columns:
                for col in date_columns:
                    print(f"  {col}")
            else:
                print("  No date columns found!")
                
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_data())
