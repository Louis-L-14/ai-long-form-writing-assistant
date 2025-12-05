from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.inspiration_service import inspiration_service

router = APIRouter()

class InspirationRequest(BaseModel):
    query: str

@router.post("/inspiration")
async def get_inspiration(request: InspirationRequest):
    result = await inspiration_service.search_inspiration(request.query)
    # Return the result directly, even if it contains an error.
    # The frontend will handle the error field.
    return result
