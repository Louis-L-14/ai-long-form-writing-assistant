import json
from typing import Dict, Any, List, Tuple
from app.services.llm_service import llm_service

class AnalysisService:
    async def analyze_chapter_content(self, content: str, project_context: str = "") -> Tuple[str, List[Dict[str, Any]]]:
        """
        Analyze chapter content to generate a summary and extract entity updates.
        Returns: (summary, entity_updates)
        """
        if not content or len(content) < 50:
            return "", []

        # We can combine summary and entity extraction into one prompt to save tokens/latency,
        # or separate them. Separating is safer for structured output.
        # Let's try a combined approach first for efficiency, but if it fails, we can split.
        # Given the complexity of entity extraction, a dedicated prompt is better.
        
        # 1. Generate Summary
        summary = await self._generate_summary(content)
        
        # 2. Extract Entities
        entity_updates = await self._extract_entities(content, project_context)
        
        return summary, entity_updates

    async def _generate_summary(self, content: str) -> str:
        prompt = f"""请为以下小说章节生成一个200-300字的精炼概要。
要求：
1. 概括主要剧情发展。
2. 记录主要角色的关键行为或状态变化。
3. 提及重要的伏笔或新出现的关键设定。

章节内容：
{content[:5000]}... (截断)
"""
        messages = [{"role": "user", "content": prompt}]
        summary = ""
        try:
            async for chunk in llm_service.generate_text(messages, stream=False):
                summary += chunk
        except Exception as e:
            print(f"Summary generation failed: {e}")
        
        return summary.strip()

    async def _extract_entities(self, content: str, project_context: str) -> List[Dict[str, Any]]:
        system_prompt = """你是一个小说设定分析助手。请分析章节内容，提取出发生变化的实体（角色、地点、物品、势力等）信息。

请返回 JSON 格式的列表，每个条目包含：
- entity_type: 实体类型 (character, location, item, faction, rule, other)
- entity_id: 实体的唯一标识符 (例如: char_linfan, loc_city_a)。如果是新实体，请根据名称生成合理的 ID。
- payload: 一个字典，包含该实体的最新属性、状态、位置或描述。只记录本章中提及或变化的属性。

示例 JSON:
[
  {
    "entity_type": "character",
    "entity_id": "char_linfan",
    "payload": {
      "status": "受伤",
      "location": "地下遗迹",
      "inventory": ["上古剑谱"]
    }
  },
  {
    "entity_type": "location",
    "entity_id": "loc_ruins",
    "payload": {
      "description": "充满古老符文的地下建筑，有守护兽出没",
      "status": "已开启"
    }
  }
]
"""
        user_prompt = f"""请分析以下章节内容，提取实体变更信息：

{content[:6000]}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_text = ""
        try:
            async for chunk in llm_service.generate_text(messages, stream=False):
                response_text += chunk
            
            # Clean JSON
            response_text = response_text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text
                if response_text.endswith("```"):
                    response_text = response_text.rsplit("\n", 1)[0]
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()
                
            return json.loads(response_text)
        except Exception as e:
            print(f"Entity extraction failed: {e}")
            print(f"Raw response: {response_text}")
            return []

    async def extract_events(self, content: str, chapter_num: int) -> List[Dict[str, Any]]:
        """
        Extract key events from chapter content.
        """
        system_prompt = """你是一个小说剧情分析专家。请分析章节内容，提取出发生的关键事件。

请返回 JSON 格式的列表，每个条目包含：
- title: 事件标题 (简短概括)
- description: 事件详细描述 (发生了什么，结果如何)
- participants: 参与该事件的角色 ID 列表 (例如: ["char_linfan", "char_xiaoyan"])
- witnesses: 知道该事件发生的角色 ID 列表 (包括参与者和旁观者)
- location_id: 事件发生的地点 ID (例如: "loc_ruins")
- significance: 重要程度 (high, medium, low)
- tags: 标签列表 (例如: ["战斗", "发现", "对话"])

示例 JSON:
[
  {
    "title": "发现上古剑谱",
    "description": "林凡在地下遗迹的密室中意外发现了失传已久的《青莲剑歌》残卷。",
    "participants": ["char_linfan"],
    "witnesses": ["char_linfan"],
    "location_id": "loc_ruins_secret_room",
    "significance": "high",
    "tags": ["发现", "奇遇"]
  }
]
"""
        user_prompt = f"""请分析以下第 {chapter_num} 章的内容，提取关键事件：

{content[:6000]}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_text = ""
        try:
            async for chunk in llm_service.generate_text(messages, stream=False):
                response_text += chunk
            
            # Clean JSON
            response_text = response_text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text
                if response_text.endswith("```"):
                    response_text = response_text.rsplit("\n", 1)[0]
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()
                
            events = json.loads(response_text)
            # Add occurred_at_chapter to each event
            for event in events:
                event['occurred_at_chapter'] = chapter_num
            return events
        except Exception as e:
            print(f"Event extraction failed: {e}")
            print(f"Raw response: {response_text}")
            return []

analysis_service = AnalysisService()
