from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
import os
from app.services.llm_service import llm_service
from .state import GenesisState


from app.core.config import settings

def get_llm():
    """Get configured LLM instance"""
    return ChatOpenAI(
        model="deepseek-chat", # Default to deepseek-chat as per llm_service
        base_url=settings.LLM_BASE_URL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
    )


async def router_node(state: GenesisState) -> Dict[str, Any]:
    """Router agent that analyzes input and determines which specialist agents to activate"""
    system_prompt = llm_service.load_prompt("genesis/unified.txt")
    
    user_prompt = f"""当前任务:分析用户输入并智能分配
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请判断用户输入涉及哪些模块（skeleton / characters / world / outline），返回 target_tabs 数组。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    # Extract JSON from response
    try:
        json_match = response.content
        if '{' in json_match:
            json_str = json_match[json_match.find('{'):json_match.rfind('}')+1]
            data = json.loads(json_str)
        else:
            data = {"target_tabs": [], "response": response.content}
    except:
        data = {"target_tabs": [], "response": response.content}
    
    target_agents = data.get("target_tabs", [])
    
    return {
        "target_agents": target_agents,
        "final_response": data.get("response", "")
    }


async def skeleton_agent_node(state: GenesisState) -> Dict[str, Any]:
    """Skeleton specialist agent"""
    if "skeleton" not in state.get("target_agents", []):
        return {"agent_outputs": {}}
        
    system_prompt = llm_service.load_prompt("genesis/skeleton.txt")
    
    user_prompt = f"""当前任务:构建骨架小纲
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请生成 JSON 格式的骨架小纲。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {
        "agent_outputs": {
            "story_formula": data.get("story_formula", ""),
            "volume1_goal": data.get("volume1_goal", ""),
            "golden_finger_rules": data.get("golden_finger_rules", []),
            "core_hook": data.get("core_hook", ""),
            "emotional_tone": data.get("emotional_tone", "")
        }
    }


async def concept_agent_node(state: GenesisState) -> Dict[str, Any]:
    """Concept specialist agent"""
    if "concept" not in state.get("target_agents", []):
        return {"agent_outputs": {}}
        
    system_prompt = llm_service.load_prompt("genesis/concept.txt")
    
    user_prompt = f"""当前任务:确立核心概念
用户输入:"{state['user_input']}"

请基于用户输入,生成以下 JSON 数据:
1. "title": 设计一个吸引人的中文书名。
2. "genre": 定义具体的流派(如:赛博修仙、克苏鲁武侠)。
3. "theme": 提炼核心主题或冲突。
4. "response": 以架构师的口吻点评这个点子,并引导用户进入下一步(主角设定)。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {"agent_outputs": {"concept": data}}


async def protagonist_agent_node(state: GenesisState) -> Dict[str, Any]:
    """Protagonist/Characters specialist agent - always tries to extract from user_input"""
    # Always try to extract characters if user mentions them
        
    system_prompt = llm_service.load_prompt("genesis/protagonist.txt")
    
    user_prompt = f"""当前任务:塑造角色
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请完善角色设定,生成 JSON:
1. "characters": 角色数组,每个角色包含: id, name, age, personality, appearance, background, relationships, role, goal, advantage
2. "response": 描述角色的形象或核心特质,并引导用户进入下一步(世界观设定)。

注意: role 必须是 "protagonist"(主角)、"antagonist"(反派) 或 "supporting"(配角) 之一。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {"agent_outputs": {"characters": data.get("characters", [])}}


async def world_agent_node(state: GenesisState) -> Dict[str, Any]:
    """World-building specialist agent - always tries to extract from user_input"""
    # Always try to extract world info if user mentions it
        
    system_prompt = llm_service.load_prompt("genesis/world.txt")
    
    user_prompt = f"""当前任务:构建世界观
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请生成完整的结构化世界观 JSON，包含macro、conflict、power_system、factions、economy、rules等所有字段。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {"agent_outputs": {"world": data}}


async def outline_agent_node(state: GenesisState) -> Dict[str, Any]:
    """Outline specialist agent"""
    if "outline" not in state.get("target_agents", []):
        return {"agent_outputs": {}}
        
    system_prompt = llm_service.load_prompt("genesis/outline.txt")
    
    user_prompt = f"""当前任务:生成故事大纲
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请生成一个符合"卷-章"结构的故事大纲,返回 JSON:
1. "outline": 数组格式,每个元素包含:
   - "id": "volume_N"
   - "title": "卷名"
   - "summary": "本卷概要:阶段目标、主要冲突、情绪结构"
   - "world_unlock": "本卷解锁的世界观信息"
   - "chapters": [{{"id": "chapter_N", "title": "章节名", "summary": "章节概要", "plot_hook": "悬念点"}}]
2. "foreshadowing": 伏笔清单数组
3. "hidden_plot": 暗线规划对象
4. "response": 简述这个大纲的整体结构和故事走向。

建议生成3-5卷,每卷3-8章。注重前30章的爽点密集度和情绪波浪设计。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {"agent_outputs": {"outline": data.get("outline", [])}}


async def first_chapter_agent_node(state: GenesisState) -> Dict[str, Any]:
    """First chapter specialist agent"""
    if "first_chapter" not in state.get("target_agents", []):
        return {"agent_outputs": {}}
        
    system_prompt = llm_service.load_prompt("genesis/first_chapter.txt")
    
    user_prompt = f"""当前任务:撰写第一章
已知蓝图:{json.dumps(state['current_data'], ensure_ascii=False)}
用户输入:"{state['user_input']}"

请撰写第一章正文，返回 JSON:
1. "title": 章节标题
2. "content": 章节正文（2000字左右）
3. "response": 简要说明本章的"钩子"设计思路。

请务必遵循"黄金三章"法则，开篇即高潮，留下强悬念。"""
    
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    try:
        json_str = response.content[response.content.find('{'):response.content.rfind('}')+1]
        data = json.loads(json_str)
    except:
        data = {}
    
    return {
        "agent_outputs": {
            "first_chapter_title": data.get("title", ""),
            "first_chapter_content": data.get("content", "")
        }
    }


async def finalizer_node(state: GenesisState) -> Dict[str, Any]:
    """Finalizer that integrates all agent outputs and provides a friendly summary"""
    agent_outputs = state.get("agent_outputs", {})
    
    # Build summary of what was completed
    summary_parts = []
    
    # Check skeleton fields
    if any(key in agent_outputs for key in ["story_formula", "volume1_goal", "golden_finger_rules", "core_hook", "emotional_tone"]):
        summary_parts.append("✅ 骨架：已提取核心创意和金手指规则")
    
    # Check characters
    if "characters" in agent_outputs and agent_outputs["characters"]:
        char_count = len(agent_outputs["characters"])
        summary_parts.append(f"✅ 角色：已设定 {char_count} 个角色")
    
    # Check world
    if "world" in agent_outputs and agent_outputs["world"]:
        summary_parts.append("✅ 世界观：已提取世界背景和初步设定")
    
    # Check outline
    if "outline" in agent_outputs and agent_outputs["outline"]:
        summary_parts.append("✅ 大纲：已生成完整故事大纲")
    
    # Check first chapter
    if "first_chapter_title" in agent_outputs:
        summary_parts.append("✅ 首章：已完成试写")
    
    # Generate friendly response
    if summary_parts:
        final_response = "太棒了！我已经为你整理了：\n\n" + "\n".join(summary_parts)
        final_response += "\n\n接下来你想完善哪部分？或者让我继续自动补全？"
    else:
        # If no outputs, use the router's response
        final_response = state.get("final_response", "我会继续帮你完善设定！")
    
    return {"final_response": final_response}
