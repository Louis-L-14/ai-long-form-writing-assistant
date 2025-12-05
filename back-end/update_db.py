import asyncio
from sqlalchemy import text
from app.db.database import engine

async def update_schema():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_info JSONB DEFAULT '{}'::jsonb;"))
    print("Schema updated successfully.")

if __name__ == "__main__":
    asyncio.run(update_schema())
