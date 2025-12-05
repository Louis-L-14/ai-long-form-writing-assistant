import asyncio
from sqlalchemy import text
from app.db.database import engine

async def update_schema():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS detailed_outline TEXT;"))
    print("Schema updated successfully: Added detailed_outline to chapters table.")

if __name__ == "__main__":
    asyncio.run(update_schema())
