from sqlalchemy.ext.asyncio import AsyncSession
from app.services.rag_service import rag_service
from app.db.models import Project
from typing import Dict, Any, List
import uuid
import logging

logger = logging.getLogger(__name__)

class RAGSyncService:
    async def sync_project_to_rag(self, db: AsyncSession, project: Project):
        """
        Syncs all entities from Project.meta_info to the RAG system (EntityVersion).
        This includes Characters, World settings, etc.
        """
        if not project.meta_info:
            logger.warning(f"Project {project.id} has no meta_info to sync.")
            return

        meta = project.meta_info
        project_id = project.id
        
        # We assume this sync happens at the beginning or after major updates.
        # For now, we set current_chapter to 1 for initial ingestion, 
        # or we could make it an argument if we want to support syncing at later chapters.
        # Given the requirement, let's assume this is a "refresh" of the knowledge base.
        # If we want to support versioning properly, we should probably know the current chapter context.
        # However, for the "Genesis -> RAG" flow, it's usually the starting state (Chapter 1).
        current_chapter = 1 

        synced_count = 0

        # 1. Sync Characters
        characters = meta.get("characters", [])
        if isinstance(characters, list):
            for char in characters:
                if not isinstance(char, dict): continue
                
                # Use name or id as entity_id
                entity_id = char.get("id") or char.get("name")
                if not entity_id: continue
                
                # Ensure entity_id is string
                entity_id = str(entity_id)
                
                await rag_service.upsert_entity_version(
                    db=db,
                    project_id=project_id,
                    entity_type="character",
                    entity_id=entity_id,
                    payload=char,
                    current_chapter=current_chapter
                )
                synced_count += 1

        # 2. Sync World Info
        world = meta.get("world", {})
        if isinstance(world, dict):
            # We can break down world info into sub-entities or store as one big "world" entity.
            # Storing as smaller chunks is better for retrieval.
            
            # Helper to sync a world component
            async def sync_component(key: str, entity_type: str = "world_setting"):
                data = world.get(key)
                if data:
                    # If it's a list (like factions), it's handled separately usually, 
                    # but for things like 'rules' which is a dict of lists, we treat it as one entity.
                    # If it's a simple string or dict, we wrap/use it.
                    payload = data if isinstance(data, dict) else {"content": data}
                    await rag_service.upsert_entity_version(
                        db=db,
                        project_id=project_id,
                        entity_type=entity_type,
                        entity_id=key,
                        payload=payload,
                        current_chapter=current_chapter
                    )
                    return 1
                return 0

            # Power System
            synced_count += await sync_component("power_system")

            # Factions (List handling)
            factions = world.get("factions", [])
            if isinstance(factions, list):
                for faction in factions:
                    if not isinstance(faction, dict): continue
                    f_name = faction.get("name", "unknown_faction")
                    await rag_service.upsert_entity_version(
                        db=db,
                        project_id=project_id,
                        entity_type="faction",
                        entity_id=f_name,
                        payload=faction,
                        current_chapter=current_chapter
                    )
                    synced_count += 1
            
            # Other World Components
            synced_count += await sync_component("macro")
            synced_count += await sync_component("economy")
            synced_count += await sync_component("rules")
            synced_count += await sync_component("history")
            synced_count += await sync_component("space")
            synced_count += await sync_component("information")
            synced_count += await sync_component("order_keepers")
            synced_count += await sync_component("aesthetic")
            synced_count += await sync_component("mc_position")
            
            # World Details (Legacy/Extra)
            synced_count += await sync_component("world_details")

        # 3. Sync Story Formula / Core Concept
        story_formula = meta.get("story_formula")
        if story_formula:
             await rag_service.upsert_entity_version(
                db=db,
                project_id=project_id,
                entity_type="concept",
                entity_id="story_formula",
                payload={"content": story_formula},
                current_chapter=current_chapter
            )
             synced_count += 1

        logger.info(f"Synced {synced_count} entities for project {project.id} to RAG.")
        return synced_count

rag_sync_service = RAGSyncService()
