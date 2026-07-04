import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    raise SystemExit('DATABASE_URL not found in backend/.env')

engine = create_async_engine(db_url, future=True)

async def main():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT id, username, email FROM users WHERE email LIKE '%@hms.local';"))
        rows = result.fetchall()
        if rows:
            print(f'Found {len(rows)} user(s) with @hms.local emails:')
            for row in rows:
                print(f'- {row.username}: {row.email}')
            await conn.execute(text(
                "UPDATE users SET email = regexp_replace(email, '@hms\\.local$', '@example.com') WHERE email LIKE '%@hms.local';"
            ))
            print('Updated seeded user emails to @example.com')
        else:
            print('No @hms.local user emails found.')

if __name__ == '__main__':
    asyncio.run(main())
