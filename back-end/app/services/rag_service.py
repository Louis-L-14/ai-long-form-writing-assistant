from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from app.db.models import EntityVersion
from app.services.embedding_service import embedding_service
from typing import List, Dict, Any, Optional
import uuid

class RAGService:
    async def upsert_entity_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        entity_type: str,
        entity_id: str,
        payload: Dict[str, Any],
        current_chapter: int
    ):
        """
        Insert a new version of an entity, handling time-travel logic.
        """
        # 1. Generate embedding for the payload
        # Convert payload to string for embedding (simplified)
        text_representation = f"{entity_type} {entity_id}: {str(payload)}"
        embedding = await embedding_service.get_embedding(text_representation)

        # 2. Find current version
        stmt = select(EntityVersion).where(
            EntityVersion.project_id == project_id,
            EntityVersion.entity_type == entity_type,
            EntityVersion.entity_id == entity_id,
            EntityVersion.is_current == True
        )
        result = await db.execute(stmt)
        current_version = result.scalar_one_or_none()

        new_version_number = 1

        # 3. Update old version if exists
        if current_version:
            new_version_number = current_version.version + 1
            
            # Mark old version as not current and set valid_to
            # Valid to is the previous chapter (current_chapter - 1)
            # If current_chapter is 1, valid_to is 0 (or maybe we handle it differently, but logic says valid_to < valid_from of next)
            valid_to = max(0, current_chapter - 1)
            
            current_version.is_current = False
            current_version.valid_to_chapter = valid_to
            db.add(current_version)

        # 4. Create new version
        new_entity = EntityVersion(
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            version=new_version_number,
            valid_from_chapter=current_chapter,
            valid_to_chapter=None, # Valid until further notice
            is_current=True,
            payload_json=payload,
            embedding=embedding
        )
        db.add(new_entity)
        await db.commit()
        await db.refresh(new_entity)
        return new_entity

    async def retrieve_context(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        query: str,
        current_chapter: int,
        limit: int = 5
    ) -> List[EntityVersion]:
        """
        Retrieve relevant entity versions based on query and current chapter.
        """
        # 1. Get query embedding
        query_embedding = await embedding_service.get_embedding(query)

        # 2. SQL Query with pgvector distance and time filtering
        # We want entities that are valid for the current_chapter:
        # valid_from <= current_chapter AND (valid_to IS NULL OR valid_to >= current_chapter)
        
        stmt = select(EntityVersion).where(
            EntityVersion.project_id == project_id,
            EntityVersion.valid_from_chapter <= current_chapter,
            or_(
                EntityVersion.valid_to_chapter == None,
                EntityVersion.valid_to_chapter >= current_chapter
            )
        ).order_by(
            EntityVersion.embedding.l2_distance(query_embedding)
        ).limit(limit)

        result = await db.execute(stmt)
        return result.scalars().all()

    async def delete_entity(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        entity_type: str,
        entity_id: str
    ):
        """
        Delete all versions of an entity.
        """
        stmt = select(EntityVersion).where(
            EntityVersion.project_id == project_id,
            EntityVersion.entity_type == entity_type,
            EntityVersion.entity_id == entity_id
        )
        result = await db.execute(stmt)
        versions = result.scalars().all()
        
        for version in versions:
            await db.delete(version)
            
        await db.commit()
        return len(versions)

    async def delete_events_for_chapter(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        chapter_num: int
    ):
        """
        Delete all event entities that occurred in a specific chapter.
        This is used for hard reset when re-analyzing a chapter.
        """
        # We need to find events where payload_json->>'occurred_at_chapter' == str(chapter_num)
        # Or simpler: we can just filter by entity_type='event' and valid_from_chapter=chapter_num
        # assuming events are created with valid_from_chapter = occurred_at_chapter
        
        stmt = select(EntityVersion).where(
            EntityVersion.project_id == project_id,
            EntityVersion.entity_type == 'event',
            EntityVersion.valid_from_chapter == chapter_num
        )
        result = await db.execute(stmt)
        events = result.scalars().all()
        
        count = 0
        for event in events:
            await db.delete(event)
            count += 1
            
        await db.commit()
        return count

    async def get_latest_entity_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        entity_type: str,
        entity_id: str
    ) -> Optional[EntityVersion]:
        """
        Get the current (latest) version of an entity.
        """
        stmt = select(EntityVersion).where(
            EntityVersion.project_id == project_id,
            EntityVersion.entity_type == entity_type,
            EntityVersion.entity_id == entity_id,
            EntityVersion.is_current == True
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

rag_service = RAGService()
