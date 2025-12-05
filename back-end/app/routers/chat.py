from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import Project, Chapter
from app.services.llm_service import llm_service
import uuid

router = APIRouter()

class ChatGenerateRequest(BaseModel):
    messages: List[Dict[str, str]]
    context_data: str
    current_chapter: int
    project_id: Optional[str] = None # Added project_id

@router.post("/generate")
async def generate_chat(request: ChatGenerateRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Global Outline & Detailed Outlines if project_id is provided
    outline_context = ""
    if request.project_id:
        try:
            # Fetch Project Global Outline
            project_result = await db.execute(select(Project).where(Project.id == uuid.UUID(request.project_id)))
            project = project_result.scalars().first()
            
            if project and project.meta_info:
                # Always include Core Skeleton & Global Outline
                story_formula = project.meta_info.get('story_formula', '')
                global_outline = project.meta_info.get('outline', '暂无大纲')
                
                if story_formula:
                    outline_context += f"【故事公式】\n{story_formula}\n\n"
                
                outline_context += f"【全书大纲】\n{global_outline}\n\n"

                # Strategy: 
                # Chapter 1: Dump full static world info (Legacy/Safe mode)
                # Chapter > 1: Use RAG to retrieve relevant Characters & World info
                
                if request.current_chapter == 1:
                    # --- Chapter 1: Full Static Context ---
                    golden_finger_rules = project.meta_info.get('golden_finger_rules', [])
                    world = project.meta_info.get('world', {})
                    
                    if golden_finger_rules:
                        outline_context += "【金手指规则】\n" + "\n".join([f"{i+1}. {r}" for i, r in enumerate(golden_finger_rules)]) + "\n\n"
                    
                    if world:
                        outline_context += "【世界观】\n"
                        # Power System
                        power = world.get('power_system', {})
                        if power:
                            outline_context += f"力量体系: {power.get('source', '')}\n"
                            if power.get('levels'):
                                outline_context += "境界: " + " → ".join([lv.get('name', '') for lv in power.get('levels', [])[:5]]) + "...\n"
                        # Factions
                        factions = world.get('factions', [])
                        if factions:
                            outline_context += "主要势力: " + ", ".join([f.get('name', '') for f in factions]) + "\n"
                        # Rules
                        rules = world.get('rules', {})
                        if rules and rules.get('public_rules'):
                            outline_context += "核心规则:\n" + "\n".join([f"  {i+1}. {r}" for i, r in enumerate(rules['public_rules'][:3])]) + "\n"
                        outline_context += "\n"
                        
                    # Also dump characters for Chapter 1 if available (missing in original code)
                    characters = project.meta_info.get('characters', [])
                    if characters:
                        outline_context += "【主要角色】\n"
                        for char in characters[:5]: # Limit to top 5 to avoid overflow
                            outline_context += f"- {char.get('name')}: {char.get('role', '')}, {char.get('personality', '')}\n"
                        outline_context += "\n"

                else:
                    # --- Chapter > 1: RAG Retrieval ---
                    from app.services.rag_service import rag_service
                    
                    # Construct Query from user messages and context
                    last_msg = request.messages[-1]['content'] if request.messages else ""
                    query = f"Chapter {request.current_chapter}. {last_msg}\nContext: {request.context_data[:300]}"
                    
                    try:
                        rag_results = await rag_service.retrieve_context(
                            db=db,
                            project_id=uuid.UUID(request.project_id),
                            query=query,
                            current_chapter=request.current_chapter,
                            limit=10 # Retrieve top 10 relevant entities
                        )
                        
                        if rag_results:
                            outline_context += "【相关资料 (RAG检索)】\n"
                            for node in rag_results:
                                # Simplify payload for prompt
                                payload_str = str(node.payload_json)
                                if len(payload_str) > 300: payload_str = payload_str[:300] + "..."
                                outline_context += f"- [{node.entity_type}] {node.entity_id}: {payload_str}\n"
                            outline_context += "\n"
                        else:
                            outline_context += "【相关资料】\n(未检索到强相关资料，请基于大纲自由发挥)\n\n"
                            
                    except Exception as e:
                        print(f"RAG Retrieval Error: {e}")
                        outline_context += f"【系统提示】\n资料检索服务暂时不可用 ({str(e)})\n\n"

            # Fetch Detailed Outlines (Current + Previous 2)
            # Assuming chapters are ordered by chapter_number
            chapters_result = await db.execute(
                select(Chapter)
                .where(Chapter.project_id == uuid.UUID(request.project_id))
                .where(Chapter.chapter_number <= request.current_chapter)
                .order_by(Chapter.chapter_number.desc())
                .limit(3)
            )
            chapters = chapters_result.scalars().all()
            
            if chapters:
                outline_context += "【近期章节细纲】\n"
                # Reverse to show in chronological order
                for chap in reversed(chapters):
                    outline_context += f"第{chap.chapter_number}章细纲: {chap.detailed_outline or '暂无'}\n"
                outline_context += "\n"
                
        except Exception as e:
            print(f"Error fetching outline context: {e}")

    # 2. Construct prompt with context
    messages = request.messages.copy()
    
    full_context = f"{outline_context}Context Information:\n{request.context_data}\n\nUse this context to assist the user."
    
    system_context_msg = {
        "role": "system",
        "content": full_context
    }
    
    # Insert context at the beginning or after existing system prompt
    if messages and messages[0]["role"] == "system":
        messages[0]["content"] += f"\n\n{system_context_msg['content']}"
    else:
        messages.insert(0, system_context_msg)

    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )
