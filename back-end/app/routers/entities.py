from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.rag_service import rag_service
from typing import Dict, Any, List
import uuid

router = APIRouter()

class EntityUpdateRequest(BaseModel):
    project_id: uuid.UUID
    entity_type: str
    entity_id: str
    payload: Dict[str, Any]
    current_chapter: int

class ContextRetrieveRequest(BaseModel):
    project_id: uuid.UUID
    query: str
    current_chapter: int
    limit: int = 5

@router.post("/entities/update")
async def update_entity(
    request: EntityUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        new_version = await rag_service.upsert_entity_version(
            db=db,
            project_id=request.project_id,
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            payload=request.payload,
            current_chapter=request.current_chapter
        )
        return {"status": "success", "version": new_version.version, "entity_id": new_version.entity_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context/retrieve")
async def retrieve_context(
    request: ContextRetrieveRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        results = await rag_service.retrieve_context(
            db=db,
            project_id=request.project_id,
            query=request.query,
            current_chapter=request.current_chapter,
            limit=request.limit
        )
        # Return simplified list
        return [
            {
                "entity_id": r.entity_id,
                "entity_type": r.entity_type,
                "version": r.version,
                "payload": r.payload_json,
                "valid_from": r.valid_from_chapter,
                "valid_to": r.valid_to_chapter
            }
            for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class EntityDeleteRequest(BaseModel):
    project_id: uuid.UUID
    entity_type: str
    entity_id: str

@router.post("/entities/delete")
async def delete_entity(
    request: EntityDeleteRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        count = await rag_service.delete_entity(
            db=db,
            project_id=request.project_id,
            entity_type=request.entity_type,
            entity_id=request.entity_id
        )
        return {"status": "success", "deleted_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
