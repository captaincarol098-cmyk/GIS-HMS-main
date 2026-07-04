import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise SystemExit("DATABASE_URL not found in backend/.env")

engine = create_engine(db_url)
with engine.begin() as conn:
    result = conn.execute(text("SELECT id, username, email FROM users WHERE email LIKE '%@hms.local';"))
    rows = result.fetchall()
    if rows:
        print(f"Found {len(rows)} user(s) with @hms.local emails:")
        for row in rows:
            print(f"- {row.username}: {row.email}")
        conn.execute(text(
            "UPDATE users SET email = regexp_replace(email, '@hms\\.local$', '@example.com') WHERE email LIKE '%@hms.local';"
        ))
        print("Updated seeded user emails to @example.com")
    else:
        print("No @hms.local user emails found.")
