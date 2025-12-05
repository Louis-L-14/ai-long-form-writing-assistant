from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import Project, Chapter, EntityVersion
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid

router = APIRouter()

# Pydantic Models
class ChapterResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    chapter_number: int
    title: str
    content: Optional[str]
    summary: Optional[str]
    detailed_outline: Optional[str]
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class EntityVersionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    entity_type: str
    entity_id: str
    version: int
    valid_from_chapter: int
    valid_to_chapter: Optional[int]
    is_current: bool
    payload_json: Dict[str, Any]
    created_at: Any

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = {}

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    meta_info: Dict[str, Any]
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    chapters: List[ChapterResponse] = []
    entity_versions: List[EntityVersionResponse] = []

@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()
    return projects

@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    new_project = Project(
        name=project.name,
        description=project.description,
        meta_info=project.meta_info
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    # Create initial chapter 1
    # Check if we have generated content from Genesis Wizard
    initial_title = "第一章"
    initial_content = ""
    
    if project.meta_info:
        if "first_chapter_title" in project.meta_info:
            initial_title = project.meta_info["first_chapter_title"]
        if "first_chapter_content" in project.meta_info:
            initial_content = project.meta_info["first_chapter_content"]

    initial_chapter = Chapter(
        project_id=new_project.id,
        chapter_number=1,
        title=initial_title,
        content=initial_content,
        summary="故事的开始..."
    )
    db.add(initial_chapter)
    await db.commit()
    
    # Sync meta_info to RAG system (EntityVersion + Vector Store)
    from app.services.rag_sync_service import rag_sync_service
    try:
        await rag_sync_service.sync_project_to_rag(db, new_project)
    except Exception as e:
        print(f"Error syncing to RAG: {e}")
        # Don't fail project creation if sync fails, but log it
        pass
            
    return new_project

@router.post("/projects/{project_id}/sync-rag")
async def sync_project_rag(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Manually trigger synchronization of project meta_info to the RAG system.
    Useful if the RAG data is out of sync or after importing a project.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    from app.services.rag_sync_service import rag_sync_service
    try:
        count = await rag_sync_service.sync_project_to_rag(db, project)
        return {"status": "success", "synced_entities": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.chapters), selectinload(Project.entity_versions))
        .where(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: uuid.UUID, update_data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if update_data.name:
        project.name = update_data.name
    if update_data.description:
        project.description = update_data.description
    if update_data.meta_info is not None:
        # Merge or replace meta_info? For now, let's merge if it's a dict, or replace
        current_meta = project.meta_info or {}
        project.meta_info = {**current_meta, **update_data.meta_info}
    
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}
