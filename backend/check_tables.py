import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        print('=== DATABASE TABLE CHECK ===\n')
        
        # Check tables
        result = await session.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        ))
        tables = result.fetchall()
        print('Tables in database:')
        for table in tables:
            print(f'  - {table[0]}')
        
        # Check measurements count
        result = await session.execute(text('SELECT COUNT(*) FROM measurements'))
        print(f'\nMeasurements table: {result.scalar()} records')
        
        # Check operation_timbang if it exists
        try:
            result = await session.execute(text('SELECT COUNT(*) FROM operation_timbang'))
            print(f'Operation Timbang table: {result.scalar()} records')
        except:
            print('Operation Timbang table: NOT FOUND')
        
        # Check opt_plus if it exists
        try:
            result = await session.execute(text('SELECT COUNT(*) FROM opt_plus'))
            print(f'OPT Plus table: {result.scalar()} records')
        except:
            print('OPT Plus table: NOT FOUND')
        
        # Get measurements by year
        print('\n=== MEASUREMENTS BY YEAR ===')
        result = await session.execute(text(
            'SELECT EXTRACT(YEAR FROM measurement_date)::int as year, COUNT(*) FROM measurements GROUP BY year ORDER BY year DESC'
        ))
        for row in result:
            print(f'  Year {int(row[0])}: {row[1]} records')
        
        # Get sample data from measurements
        print('\n=== MEASUREMENTS SAMPLE ===')
        result = await session.execute(text(
            'SELECT id, child_id, measurement_date, EXTRACT(YEAR FROM measurement_date)::int as year FROM measurements LIMIT 5'
        ))
        for row in result:
            print(f'  ID: {row[0]}, Child: {row[1]}, Date: {row[2]}, Year: {row[3]}')

asyncio.run(check())
