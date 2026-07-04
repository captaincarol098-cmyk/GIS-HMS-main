import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        try:
            # Check if measurement_date column has data
            result = await session.execute(text(
                'SELECT COUNT(*), MIN(measurement_date), MAX(measurement_date) FROM measurements'
            ))
            total, min_date, max_date = result.fetchone()
            print(f'Total measurements: {total}')
            print(f'Date range: {min_date} to {max_date}')
            
            # Check specific years with EXTRACT (PostgreSQL syntax)
            result = await session.execute(text(
                "SELECT EXTRACT(YEAR FROM measurement_date)::int as year, COUNT(*) FROM measurements GROUP BY year ORDER BY year DESC"
            ))
            print('\nMeasurements by year:')
            for row in result:
                print(f'  Year {int(row[0])}: {row[1]} records')
        except Exception as e:
            print(f'Error: {e}')

asyncio.run(check())
