from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import Chapter
from pydantic import BaseModel
from typing import Optional, Any
import uuid
import json

router = APIRouter()

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    detailed_outline: Optional[str] = None

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

@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@router.put("/chapters/{chapter_id}")
async def update_chapter(chapter_id: uuid.UUID, update_data: ChapterUpdate, db: AsyncSession = Depends(get_db)):
    import time
    start_time = time.time()
    execution_steps = []
    
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Check if content changed significantly to trigger analysis
    # For simplicity, we trigger analysis if content is updated and length > 100
    should_analyze = False
    if update_data.content is not None and len(update_data.content) > 100:
        # In a real app, we might check diff or have a manual "Save & Analyze" flag
        should_analyze = True

    if update_data.title is not None:
        chapter.title = update_data.title
    if update_data.content is not None:
        chapter.content = update_data.content
    if update_data.summary is not None:
        chapter.summary = update_data.summary
    if update_data.detailed_outline is not None:
        chapter.detailed_outline = update_data.detailed_outline
    
    
    # Step 1: Content Save (mark as queued, will commit at the end)
    execution_steps.append({
        "step": "content_save",
        "status": "success",
        "message": "章节内容已保存"
    })
    
    # Perform Analysis & RAG Update if needed
    if should_analyze:
        try:
            from app.services.analysis_service import analysis_service
            from app.services.rag_service import rag_service
            
            print(f"🔍 Analyzing chapter {chapter.chapter_number}...")
            
            # Step 2: Summary & Entity Extraction
            try:
                summary, entity_updates = await analysis_service.analyze_chapter_content(chapter.content)
                
                entities_updated = 0
                if summary:
                    chapter.summary = summary
                    print(f"✅ Summary updated.")
                
                if entity_updates:
                    print(f"🔄 Updating {len(entity_updates)} entities...")
                    for entity in entity_updates:
                        await rag_service.upsert_entity_version(
                            db,
                            project_id=chapter.project_id,
                            entity_type=entity.get('entity_type', 'unknown'),
                            entity_id=entity.get('entity_id', 'unknown'),
                            payload=entity.get('payload', {}),
                            current_chapter=chapter.chapter_number
                        )
                        entities_updated += 1
                
                execution_steps.append({
                    "step": "analysis",
                    "status": "success",
                    "message": "自动分析完成",
                    "details": {
                        "summary_generated": bool(summary),
                        "entities_updated": entities_updated
                    }
                })
            except Exception as e:
                print(f"❌ Analysis failed: {e}")
                execution_steps.append({
                    "step": "analysis",
                    "status": "failed",
                    "message": f"分析失败: {str(e)}"
                })
            
            # Step 3: Event Extraction & Knowledge Propagation
            try:
                print(f"📅 Extracting events...")
                events = await analysis_service.extract_events(chapter.content, chapter.chapter_number)
                
                events_extracted = 0
                characters_notified = 0
                
                if events:
                    print(f"Found {len(events)} events.")
                    events_extracted = len(events)
                    
                    # Hard Reset: Delete old events for this chapter to ensure consistency
                    # We need a method in rag_service or just do it here.
                    # Let's add delete_events_for_chapter in rag_service later, for now do it manually or via rag_service
                    # Actually, let's implement a helper in rag_service for this.
                    await rag_service.delete_events_for_chapter(db, chapter.project_id, chapter.chapter_number)
                    
                    for event_data in events:
                        # Create Event Entity
                        event_id = f"evt_{uuid.uuid4().hex[:8]}"
                        await rag_service.upsert_entity_version(
                            db,
                            project_id=chapter.project_id,
                            entity_type="event",
                            entity_id=event_id,
                            payload=event_data,
                            current_chapter=chapter.chapter_number
                        )
                        
                        # Propagate Knowledge to Witnesses
                        witnesses = event_data.get('witnesses', [])
                        for char_id in witnesses:
                            # Get current version of character
                            # We need to be careful not to create infinite loops or excessive versions
                            # For MVP, we fetch the character, update known_events, and upsert
                            
                            # Find character (we need a way to get by ID)
                            # rag_service.retrieve_context is for similarity search.
                            # We need get_entity_by_id.
                            # Let's add get_latest_entity_version to rag_service.
                            char_entity = await rag_service.get_latest_entity_version(
                                db, chapter.project_id, "character", char_id
                            )
                            
                            if char_entity:
                                current_payload = char_entity.payload_json.copy()
                                known_events = current_payload.get('known_events', [])
                                if event_id not in known_events:
                                    known_events.append(event_id)
                                    current_payload['known_events'] = known_events
                                    
                                    await rag_service.upsert_entity_version(
                                        db,
                                        project_id=chapter.project_id,
                                        entity_type="character",
                                        entity_id=char_id,
                                        payload=current_payload,
                                        current_chapter=chapter.chapter_number
                                    )
                                    characters_notified += 1
                                    print(f"  -> Updated knowledge for {char_id}")

                execution_steps.append({
                    "step": "events",
                    "status": "success",
                    "message": "事件提取完成",
                    "details": {
                        "events_extracted": events_extracted,
                        "characters_notified": characters_notified
                    }
                })
            except Exception as e:
                print(f"❌ Event extraction failed: {e}")
                execution_steps.append({
                    "step": "events",
                    "status": "failed",
                    "message": f"事件提取失败: {str(e)}"
                })

            print(f"✅ Analysis complete.")
            
            # Step 4: Outline Synchronization
            print(f"📋 Checking outline synchronization...")
            outline_sync_result = None
            try:
                from app.services.outline_service import outline_service
                
                outline_sync_result = await outline_service.sync_outline_after_chapter_save(
                    db,
                    chapter.project_id,
                    chapter.chapter_number,
                    chapter.content
                )
                
                if outline_sync_result and outline_sync_result.get('sync_performed'):
                    print(f"  ✅ Outline synced: {outline_sync_result.get('subsequent_updated', 0)} subsequent chapters updated")
                    execution_steps.append({
                        "step": "outline_sync",
                        "status": "success",
                        "message": "大纲同步完成",
                        "details": {
                            "deviation_level": outline_sync_result.get('deviation_level', 'none'),
                            "subsequent_updated": outline_sync_result.get('subsequent_updated', 0),
                            "analysis": outline_sync_result.get('analysis', '')
                        }
                    })
                else:
                    print(f"  ℹ️  No outline sync needed")
                    execution_steps.append({
                        "step": "outline_sync",
                        "status": "success",
                        "message": "无需同步大纲"
                    })
                    
            except Exception as e:
                print(f"  ⚠️  Outline sync failed: {e}")
                import traceback
                traceback.print_exc()
                execution_steps.append({
                    "step": "outline_sync",
                    "status": "failed",
                    "message": f"大纲同步失败: {str(e)}"
                })
                
        except Exception as e:
            print(f"❌ Analysis failed: {e}")
            import traceback
            traceback.print_exc()
            pass


    # Final commit after all modifications
    await db.commit()
    await db.refresh(chapter)
    
    # Calculate total duration
    total_duration_ms = int((time.time() - start_time) * 1000)
    
    # Attach outline sync result if available
    chapter_dict = {
        "id": chapter.id,
        "project_id": chapter.project_id,
        "chapter_number": chapter.chapter_number,
        "title": chapter.title,
        "content": chapter.content,
        "summary": chapter.summary,
        "detailed_outline": chapter.detailed_outline,

        "created_at": chapter.created_at,
        "updated_at": chapter.updated_at,
        "execution_report": {
            "steps_completed": execution_steps,
            "total_duration_ms": total_duration_ms
        }
    }
    
    return chapter_dict

class GenerateChapterRequest(BaseModel):
    project_id: uuid.UUID
    instructions: str
    previous_chapter_id: Optional[uuid.UUID] = None

@router.post("/chapters/generate")
async def generate_chapter(request: GenerateChapterRequest, db: AsyncSession = Depends(get_db)):
    """Generate content for the next chapter based on instructions, with rich context."""
    from app.services.llm_service import llm_service
    from app.services.rag_service import rag_service
    from app.db.models import Project
    
    # 1. Fetch project info
    result = await db.execute(select(Project).where(Project.id == request.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 2. Determine current chapter number (for context validity)
    # If we have previous chapter, next is prev + 1. If not, assume 1.
    next_chapter_num = 1
    prev_chapter = None
    prev_content_tail = ""
    prev_summary = "无"

    if request.previous_chapter_id:
        prev_result = await db.execute(select(Chapter).where(Chapter.id == request.previous_chapter_id))
        prev_chapter = prev_result.scalars().first()
        if prev_chapter:
            next_chapter_num = prev_chapter.chapter_number + 1
            # Use summary + tail
            prev_summary = prev_chapter.summary or "暂无概要"
            if prev_chapter.content:
                prev_content_tail = prev_chapter.content[-500:]
            
    # 3. RAG Retrieval (Characters & World & Events)
    # Retrieve entities valid for the NEXT chapter
    rag_context = ""
    try:
        # Retrieve general context based on instructions
        relevant_entities = await rag_service.retrieve_context(
            db, 
            request.project_id, 
            query=request.instructions, 
            current_chapter=next_chapter_num,
            limit=10 
        )
        
        if relevant_entities:
            rag_context = "【相关角色与世界观】\n"
            
            # Separate events and other entities
            events = []
            others = []
            
            for entity in relevant_entities:
                if entity.entity_type == 'event':
                    events.append(entity)
                else:
                    others.append(entity)
            
            for entity in others:
                payload_str = json.dumps(entity.payload_json, ensure_ascii=False)
                rag_context += f"- [{entity.entity_type}] {entity.entity_id}: {payload_str}\n"

            # Process Events (Known vs Unknown)
            # For now, we don't strictly enforce POV filtering in the prompt construction 
            # because we haven't determined the POV character dynamically yet.
            # But we can list them as "Recent Events"
            if events:
                rag_context += "\n【相关历史事件】\n"
                for event in events:
                    payload = event.payload_json
                    rag_context += f"- [Event] {payload.get('title')}: {payload.get('description')} (发生于第{payload.get('occurred_at_chapter')}章)\n"
                    
    except Exception as e:
        print(f"RAG retrieval failed: {e}")

    # 4. Smart Outline Extraction
    outline_context = ""
    meta = project.meta_info or {}
    full_outline = meta.get('outline', [])
    
    if full_outline:
        # Flatten outline to find current position
        flat_chapters = []
        for v_idx, vol in enumerate(full_outline):
            vol_title = vol.get('title', f'第{v_idx+1}卷')
            for c_idx, ch in enumerate(vol.get('chapters', [])):
                flat_chapters.append({
                    'vol_title': vol_title,
                    'ch_title': ch.get('title', ''),
                    'summary': ch.get('summary', '') or ch.get('description', ''),
                    'index': len(flat_chapters)
                })
        
        # Find target index (approximate by chapter number if possible, or just append)
        # Since we don't strictly link outline items to chapter IDs yet, we assume 
        # the outline sequence matches the chapter numbers.
        # Target index is next_chapter_num - 1 (0-indexed)
        target_idx = next_chapter_num - 1
        
        # Extract window: Current Volume + surrounding
        # For simplicity, let's take a window of +/- 5 chapters around target
        start_idx = max(0, target_idx - 5)
        end_idx = min(len(flat_chapters), target_idx + 10) # Look ahead more
        
        outline_context = "【大纲上下文】\n"
        current_vol = ""
        for i in range(start_idx, end_idx):
            item = flat_chapters[i]
            if item['vol_title'] != current_vol:
                outline_context += f"\n== {item['vol_title']} ==\n"
                current_vol = item['vol_title']
            
            marker = " (当前)" if i == target_idx else ""
            outline_context += f"- {item['ch_title']}: {item['summary']}{marker}\n"

    # 5. Construct Prompt with Smart Priority Handling
    has_user_instructions = request.instructions and len(request.instructions.strip()) > 0
    
    if has_user_instructions:
        # User provided specific instructions - prioritize them
        instruction_context = f"""【用户创作指令】
{request.instructions}

【优先级规则】
- 用户创作指令 > 大纲建议
- 如果用户指令与大纲有微小冲突（如改变场景细节、增加配角对话），请自然融合两者
- 如果有重大冲突（如改变关键剧情走向），以用户指令为准，但请设法为后续章节留下回旋余地，保持故事整体连贯性"""
    else:
        # No user instructions - follow outline strictly
        instruction_context = """【创作模式】
严格按照大纲继续创作。无特殊指示，请根据大纲中本章的计划内容进行创作。"""
    
    system_prompt = """你是一位专业的小说创作者。请根据用户提供的项目背景、大纲脉络、相关设定以及上一章概要，创作下一章的内容。

要求：
1. **剧情承接**：紧密衔接上一章的结尾和概要。
2. **设定一致**：严格遵守提供的角色和世界观设定。
3. **指令遵循**：遵循创作指令和优先级规则（见下方）。
4. **格式规范**：输出内容必须包含章节标题和正文。

格式：
# 章节标题
正文内容..."""

    user_prompt = f"""【项目背景】
类型: {meta.get('genre', '未定')}
主题: {meta.get('theme', '')}

{outline_context}

{rag_context}

【上一章概要】
{prev_summary}

【上一章结尾】
{prev_content_tail}

{instruction_context}

请开始创作："""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    # 6. Generate Content (Streaming)
    # 6. Generate Content (Streaming)
    async def generate_stream():
        import json
        
        # Send context summary first
        # We need to safely access variables from the outer scope
        rag_chars = [e.entity_id for e in others] if 'others' in locals() else []
        rag_events = [e.payload_json.get('title', 'Unknown Event') for e in events] if 'events' in locals() else []
        
        outline_chapters = []
        if 'flat_chapters' in locals() and 'start_idx' in locals() and 'end_idx' in locals():
            outline_chapters = [item['ch_title'] for item in flat_chapters[start_idx:end_idx]]
            
        context_summary = {
            "type": "context_summary",
            "data": {
                "outline": {
                    "summary": "完整大纲" if full_outline else "无大纲",
                    "surrounding_chapters": outline_chapters
                },
                "rag": {
                    "characters": rag_chars,
                    "events": rag_events,
                },
                "prev_chapter": {
                    "summary": prev_summary[:100] + "..." if prev_summary else "无"
                },
                "instructions": {
                    "type": "用户指令" if has_user_instructions else "大纲模式",
                    "content": request.instructions if has_user_instructions else "严格遵循大纲"
                }
            }
        }
        yield json.dumps(context_summary, ensure_ascii=False) + "\n"

        async for chunk in llm_service.generate_text(messages, stream=True):
            yield chunk

    return StreamingResponse(generate_stream(), media_type="text/plain")

class CreateChapterRequest(BaseModel):
    title: str
    chapter_number: int
    content: str
    summary: Optional[str] = None

@router.post("/projects/{project_id}/chapters", response_model=ChapterResponse)
async def create_chapter(project_id: uuid.UUID, request: CreateChapterRequest, db: AsyncSession = Depends(get_db)):
    # Verify project exists
    from app.db.models import Project
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_chapter = Chapter(
        project_id=project_id,
        chapter_number=request.chapter_number,
        title=request.title,
        content=request.content,
        summary=request.summary
    )
    
    db.add(new_chapter)
    await db.commit()
    await db.refresh(new_chapter)
    
    return new_chapter
