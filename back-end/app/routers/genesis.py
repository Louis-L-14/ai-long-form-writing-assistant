from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.llm_service import llm_service
import json

router = APIRouter()

class GenerateConceptRequest(BaseModel):
    user_input: str
    inspiration_context: Optional[str] = ""

class GenerateProtagonistRequest(BaseModel):
    user_input: str
    current_data: Dict[str, Any]

class GenerateWorldRequest(BaseModel):
    user_input: str
    current_data: Dict[str, Any]

class GenerateOutlineRequest(BaseModel):
    user_input: str
    current_data: Dict[str, Any]

class GenerateUnifiedRequest(BaseModel):
    user_input: str
    current_data: Dict[str, Any]
    inspiration_context: Optional[str] = ""

class GenerateFirstChapterRequest(BaseModel):
    user_input: str
    current_data: Dict[str, Any]

@router.post("/concept")
async def generate_concept(request: GenerateConceptRequest):
    """Generate core concept (title, genre, theme) for a new project."""
    
    # Load system prompt from file
    system_prompt = llm_service.load_prompt("genesis/concept.txt")
    
    # Construct user prompt
    user_prompt = f"""当前任务:确立核心概念
用户输入:"{request.user_input}"
参考灵感:{request.inspiration_context}

请基于用户输入,生成以下 JSON 数据:
1. "title": 设计一个吸引人的中文书名。
2. "genre": 定义具体的流派(如:赛博修仙、克苏鲁武侠)。
3. "theme": 提炼核心主题或冲突。
4. "response": 以架构师的口吻点评这个点子,并引导用户进入下一步(主角设定)。如果用户输入模糊,请主动提出建议。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

class GenerateSkeletonRequest(BaseModel):
    user_input: str
    inspiration_context: Optional[str] = ""

@router.post("/skeleton")
async def generate_skeleton(request: GenerateSkeletonRequest):
    """Generate project skeleton (formula, goal, rules)."""
    
    system_prompt = llm_service.load_prompt("genesis/skeleton.txt")
    
    user_prompt = f"""当前任务:构建骨架小纲
用户输入:"{request.user_input}"
参考灵感:{request.inspiration_context}

请生成 JSON 格式的骨架小纲，包含：
1. "title": 极具吸引力的书名（项目名称）
2. "story_formula": 故事公式
3. "volume1_goal": 第一卷目标
4. "golden_finger_rules": 金手指规则（数组）
5. "core_hook": 核心钩子
6. "emotional_tone": 情感基调"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

@router.post("/protagonist")
async def generate_protagonist(request: GenerateProtagonistRequest):
    """Generate protagonist details based on established concept."""
    
    system_prompt = llm_service.load_prompt("genesis/protagonist.txt")
    
    user_prompt = f"""当前任务:塑造角色
已知蓝图:{json.dumps(request.current_data, ensure_ascii=False)}
用户输入:"{request.user_input}"

请完善角色设定,生成 JSON:
1. "characters": 角色数组,每个角色包含: id, name, age, personality, appearance, background, relationships, role, goal, advantage
2. "response": 描述角色的形象或核心特质,并引导用户进入下一步(世界观设定)。如果用户未提供细节,请根据流派自动生成匹配的角色。

注意: role 必须是 "protagonist"(主角)、"antagonist"(反派) 或 "supporting"(配角) 之一。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

@router.post("/world")
async def generate_world(request: GenerateWorldRequest):
    """Generate world-building elements (power system, factions)."""
    
    system_prompt = llm_service.load_prompt("genesis/world.txt")
    
    user_prompt = f"""当前任务:构建世界观
已知蓝图:{json.dumps(request.current_data, ensure_ascii=False)}
用户输入:"{request.user_input}"

请完善世界观,生成 JSON:
1. "power_system": 定义力量/升级体系。
2. "main_faction": 设计主要的反派或对立势力。
3. "world_details": 包含 setting, core_rules, hidden_layers 的对象。
4. "response": 总结世界观设定,并引导用户进入下一步(大纲生成)。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

@router.post("/outline")
async def generate_outline(request: GenerateOutlineRequest):
    """Generate full story outline with volume-chapter structure."""
    
    system_prompt = llm_service.load_prompt("genesis/outline.txt")
    
    user_prompt = f"""当前任务:生成故事大纲
已知蓝图:{json.dumps(request.current_data, ensure_ascii=False)}
用户输入:"{request.user_input}"

请生成一个符合"卷-章"结构的故事大纲,返回 JSON:
1. "outline": 数组格式,每个元素包含:
   - "id": "volume_N"
   - "title": "卷名"
   - "summary": "本卷概要:阶段目标、主要冲突、情绪结构"
   - "world_unlock": "本卷解锁的世界观信息"
   - "chapters": [{{"id": "chapter_N", "title": "章节名", "summary": "章节概要", "plot_hook": "悬念点"}}]
2. "foreshadowing": 伏笔清单数组
3. "hidden_plot": 暗线规划对象
4. "response": 简述这个大纲的整体结构和故事走向,并热情地邀请用户开始正文创作。

建议生成3-5卷,每卷3-8章。注重前30章的爽点密集度和情绪波浪设计。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

@router.post("/first_chapter")
async def generate_first_chapter(request: GenerateFirstChapterRequest):
    """Generate the first chapter based on all established project info."""
    
    system_prompt = llm_service.load_prompt("genesis/first_chapter.txt")
    
    user_prompt = f"""当前任务:撰写第一章
已知蓝图:{json.dumps(request.current_data, ensure_ascii=False)}
用户输入:"{request.user_input}"

请撰写第一章正文，返回 JSON:
1. "title": 章节标题
2. "content": 章节正文（2000字左右）
3. "response": 简要说明本章的"钩子"设计思路。

请务必遵循"黄金三章"法则，开篇即高潮，留下强悬念。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return StreamingResponse(
        llm_service.generate_text(messages, stream=True),
        media_type="text/event-stream"
    )

class SuggestTitleRequest(BaseModel):
    project_data: Dict[str, Any]

def clean_json_string(text: str) -> str:
    """Clean LLM response to ensure valid JSON."""
    text = text.strip()
    # Remove markdown code blocks if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("\n", 1)[0]
    # Remove "json" language identifier if present
    if text.startswith("json"):
        text = text[4:].strip()
    return text

@router.post("/suggest_title")
async def suggest_title(request: SuggestTitleRequest):
    """Generate title suggestions using 3-step process: Analysis -> Search -> Synthesis."""
    from app.services.inspiration_service import inspiration_service
    
    project_data = request.project_data
    
    # Extract rich data
    genre = project_data.get("genre", "未定")
    theme = project_data.get("theme", "")
    description = project_data.get("description", "")
    story_formula = project_data.get("story_formula", "")
    core_hook = project_data.get("core_hook", "")
    
    # Handle complex objects (outline, characters, world) which might be lists or dicts
    outline = json.dumps(project_data.get("outline", []), ensure_ascii=False)[:2000] # Truncate to avoid context limit
    characters = json.dumps(project_data.get("characters", []), ensure_ascii=False)[:1500]
    world = json.dumps(project_data.get("world_details", {}), ensure_ascii=False)[:1000]
    
    print(f"\n{'='*60}")
    print(f"🚀 STARTING TITLE GENERATION (3-STEP PROCESS)")
    print(f"{'='*60}\n")

    # =================================================================================
    # STEP 1: DEEP ANALYSIS
    # =================================================================================
    print(f"--- STEP 1: DEEP ANALYSIS ---")
    analysis_prompt = llm_service.load_prompt("genesis/title_analysis_prompt.txt")
    analysis_user_prompt = f"""请分析以下小说项目信息：

【基本信息】
类型: {genre}
主题: {theme}
一句话简介: {description}
故事公式: {story_formula}
核心钩子: {core_hook}

【大纲摘要】
{outline}

【主要角色】
{characters}

【世界观摘要】
{world}
"""
    
    analysis_messages = [
        {"role": "system", "content": analysis_prompt},
        {"role": "user", "content": analysis_user_prompt}
    ]
    
    analysis_response = ""
    async for chunk in llm_service.generate_text(analysis_messages, stream=False):
        analysis_response += chunk
        
    try:
        cleaned_response = clean_json_string(analysis_response)
        analysis_data = json.loads(cleaned_response)
        core_elements = analysis_data.get("core_elements", [])
        selling_point = analysis_data.get("selling_point_summary", "")
        naming_direction = analysis_data.get("naming_direction", "")
        
        print(f"Core Elements: {core_elements}")
        print(f"Selling Point: {selling_point}")
        print(f"Direction: {naming_direction}\n")
    except Exception as e:
        print(f"Analysis parsing failed: {e}")
        print(f"Raw response: {analysis_response}")
        core_elements = [genre, theme]
        selling_point = description
        naming_direction = "常规网文风格"

    # =================================================================================
    # STEP 2: STYLE SEARCH
    # =================================================================================
    print(f"--- STEP 2: STYLE SEARCH ---")
    query_gen_prompt = llm_service.load_prompt("genesis/search_query_generator.txt")
    query_gen_user_prompt = f"""基于以下深度分析结果生成搜索查询：

核心元素: {json.dumps(core_elements, ensure_ascii=False)}
卖点总结: {selling_point}
命名方向: {naming_direction}
"""
    
    query_messages = [
        {"role": "system", "content": query_gen_prompt},
        {"role": "user", "content": query_gen_user_prompt}
    ]
    
    query_response = ""
    async for chunk in llm_service.generate_text(query_messages, stream=False):
        query_response += chunk
    
    try:
        cleaned_query = clean_json_string(query_response)
        query_data = json.loads(cleaned_query)
        search_queries = query_data.get("queries", [])
    except Exception as e:
        print(f"Query parsing failed: {e}")
        search_queries = [f"{genre} {core_elements[0]} 热门小说"]

    all_search_results = []
    for search_query in search_queries[:2]:
        print(f"🔍 Searching: {search_query}")
        try:
            search_results = await inspiration_service.search_inspiration(search_query)
            if "results" in search_results:
                # Log titles found
                found_titles = [r.get('title', 'N/A') for r in search_results["results"][:3]]
                print(f"   Found: {found_titles}")
                all_search_results.extend(search_results.get("results", [])[:5])
        except Exception as e:
            print(f"   Search failed: {e}")

    # =================================================================================
    # STEP 3: SYNTHESIS
    # =================================================================================
    print(f"\n--- STEP 3: SYNTHESIS ---")
    
    # Prepare context
    search_context = ""
    if all_search_results:
        search_context = "\n【市场热门参考】\n"
        for idx, result in enumerate(all_search_results[:8], 1):
            title = result.get("title", "")
            content = result.get("content", "")[:100]
            search_context += f"{idx}. {title} ({content})\n"

    synthesis_system_prompt = """你是一位金牌网文编辑。请根据项目分析和市场参考，创作5个极具吸引力的书名。

要求：
1. **结合核心元素**：必须体现分析出的核心金手指、身份或冲突。
2. **参考市场风向**：借鉴搜索到的热门书名的命名结构（如"XX+系统"、"开局+XX"），但严禁抄袭。
3. **风格多样**：提供不同风格的选项（如直白爽文风、文艺风、悬疑风）。
4. **解释理由**：为每个书名提供简短的推荐理由。

返回 JSON:
{
  "suggestions": ["书名1", "书名2", "书名3", "书名4", "书名5"]
}"""

    synthesis_user_prompt = f"""【项目深度分析】
核心元素: {core_elements}
卖点: {selling_point}
建议方向: {naming_direction}

{search_context}

请生成5个书名建议。"""

    synthesis_messages = [
        {"role": "system", "content": synthesis_system_prompt},
        {"role": "user", "content": synthesis_user_prompt}
    ]

    suggestions_text = ""
    async for chunk in llm_service.generate_text(synthesis_messages, stream=False):
        suggestions_text += chunk
    
    try:
        cleaned_suggestions = clean_json_string(suggestions_text)
        suggestions_data = json.loads(cleaned_suggestions)
        print(f"✅ Generated: {suggestions_data.get('suggestions', [])}")
        return suggestions_data
    except Exception as e:
        print(f"Synthesis parsing failed: {e}")
        print(f"Raw text: {suggestions_text}")
        return {"suggestions": ["数据解析失败，请重试"]}

@router.post("/unified")
async def generate_unified(request: GenerateUnifiedRequest):
    """Unified AI entry using LangGraph multi-agent collaboration with event streaming."""
    from app.agents import genesis_graph, GenesisState
    
    # Prepare initial state
    initial_state: GenesisState = {
        "user_input": f"{request.user_input}\n\n参考灵感:\n{request.inspiration_context}" if request.inspiration_context else request.user_input,
        "current_data": request.current_data,
        "target_agents": [],
        "agent_outputs": {},
        "final_response": ""
    }
    
    async def event_generator():
        aggregated_outputs: Dict[str, Any] = {}
        final_response_text = ""
        
        try:
            # Stream events from the graph
            async for event in genesis_graph.astream(initial_state):
                for node_name, state_update in event.items():
                    # Yield status update
                    yield json.dumps({"type": "status", "agent": node_name, "status": "working"}, ensure_ascii=False) + "\n"

                    # Track latest final response from finalizer
                    if "final_response" in state_update:
                        final_response_text = state_update["final_response"]
                    
                    # Yield intermediate results if available
                    current_outputs = state_update.get("agent_outputs", {})
                    if current_outputs:
                        # Merge into aggregated outputs so we don't lose earlier modules
                        aggregated_outputs = {**aggregated_outputs, **current_outputs}

                        partial_data = {}
                        # Skeleton fields
                        if "story_formula" in current_outputs:
                            partial_data["story_formula"] = current_outputs["story_formula"]
                        if "volume1_goal" in current_outputs:
                            partial_data["volume1_goal"] = current_outputs["volume1_goal"]
                        if "golden_finger_rules" in current_outputs:
                            partial_data["golden_finger_rules"] = current_outputs["golden_finger_rules"]
                        if "core_hook" in current_outputs:
                            partial_data["core_hook"] = current_outputs["core_hook"]
                        if "emotional_tone" in current_outputs:
                            partial_data["emotional_tone"] = current_outputs["emotional_tone"]

                        # Characters
                        if "characters" in current_outputs:
                            partial_data["characters"] = current_outputs["characters"]

                        # World
                        if "world" in current_outputs:
                            partial_data["world"] = current_outputs["world"]

                        # Outline
                        if "outline" in current_outputs:
                            partial_data["outline"] = current_outputs["outline"]

                        # First chapter (mapped to title/content for frontend compatibility)
                        if "first_chapter_title" in current_outputs or "first_chapter_content" in current_outputs:
                            partial_data["title"] = current_outputs.get("first_chapter_title", "")
                            partial_data["content"] = current_outputs.get("first_chapter_content", "")

                        # Concept (if router produced it)
                        if "concept" in current_outputs:
                            partial_data["concept"] = current_outputs["concept"]
                        
                        if partial_data:
                            yield json.dumps({"type": "result", "data": partial_data}, ensure_ascii=False) + "\n"
            
            # After all nodes complete, yield final result
            response_data = {"response": final_response_text}

            # Attach all aggregated agent outputs
            for key, value in aggregated_outputs.items():
                # first chapter is remapped for frontend compatibility
                if key in ("first_chapter_title", "first_chapter_content"):
                    continue
                response_data[key] = value

            if "first_chapter_title" in aggregated_outputs:
                response_data["title"] = aggregated_outputs["first_chapter_title"]
                response_data["content"] = aggregated_outputs.get("first_chapter_content", "")

            # Yield final result
            yield json.dumps({"type": "result", "data": response_data}, ensure_ascii=False) + "\n"
            
        except Exception as e:
            import traceback
            print(f"Error in event_generator: {traceback.format_exc()}")
            yield json.dumps({"type": "status", "message": f"系统错误: {str(e)}"}, ensure_ascii=False) + "\n"

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson"
    )
