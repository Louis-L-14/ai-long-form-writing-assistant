import json
from typing import Dict, Any, List, Optional, Tuple
from app.services.llm_service import llm_service
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Project
import uuid

class OutlineService:
    async def compare_content_to_outline(
        self, 
        content: str, 
        current_outline_item: Dict[str, Any],
        chapter_num: int
    ) -> Dict[str, Any]:
        """
        Compare chapter content with its outline to determine if update is needed.
        
        Returns:
            {
                "needs_update": bool,
                "deviation_level": "none" | "minor" | "major",
                "suggested_outline": {...},
                "analysis": "..."
            }
        """
        if not content or len(content) < 100:
            return {"needs_update": False, "deviation_level": "none"}
        
        system_prompt = """你是一个小说大纲分析专家。请对比章节正文与原大纲，判断是否需要更新大纲。

【分析维度】
1. 主要情节是否一致
2. 关键人物行为是否符合预期
3. 重要设定是否有变化

【偏离等级】
- none: 正文完全符合大纲
- minor: 有细节差异但不影响主线（如增加对话、场景描写）
- major: 核心剧情有变化（如角色决策不同、结局改变）

【输出格式】
返回 JSON：
{
  "needs_update": true/false,
  "deviation_level": "none/minor/major",
  "suggested_outline": {
    "title": "修改后的章节标题（若需要）",
    "summary": "修改后的章节概要"
  },
  "analysis": "简要分析正文与大纲的差异"
}
"""
        
        user_prompt = f"""【原大纲】
标题: {current_outline_item.get('title', '未知')}
概要: {current_outline_item.get('summary') or current_outline_item.get('description', '')}

【实际正文】（前2000字）
{content[:2000]}

请分析并返回JSON："""

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
            
            result = json.loads(response_text)
            result['chapter_num'] = chapter_num
            return result
            
        except Exception as e:
            print(f"Outline comparison failed: {e}")
            print(f"Raw response: {response_text}")
            return {"needs_update": False, "deviation_level": "none", "error": str(e)}
    
    async def batch_update_subsequent_outline(
        self,
        modified_chapter_num: int,
        old_outline_item: Dict[str, Any],
        new_outline_item: Dict[str, Any],
        subsequent_chapters: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Batch update all subsequent chapters in one LLM call.
        
        Args:
            modified_chapter_num: The chapter number that was modified
            old_outline_item: Original outline for the modified chapter
            new_outline_item: New outline for the modified chapter
            subsequent_chapters: List of subsequent chapter outlines
        
        Returns:
            {
                "modified_chapters": [...],
                "total_changes": int,
                "high_impact_changes": [...]
            }
        """
        if not subsequent_chapters:
            return {"modified_chapters": [], "total_changes": 0}
        
        system_prompt = """你是一个小说大纲维护专家。你的任务是根据某一章的大纲修改，调整后续章节的大纲以保持逻辑一致性。

【核心原则】
1. **最小化修改**：仅调整与修改章节有逻辑冲突的部分
2. **保留核心剧情**：后续章节的关键转折点和高潮设计尽量保持
3. **连贯性优先**：确保修改后的大纲前后逻辑自洽

【工作流程】
1. 理解修改章节的变化内容
2. 逐章思考：这个修改会影响这一章吗？
3. 对每一章判断：
   - 是否需要修改？
   - 如需修改，最小改动是什么？
4. 输出完整的修改列表

【输出要求】
返回完整的JSON，包含所有后续章节。对于无需修改的章节，保持原内容不变。
格式：
{
  "modified_chapters": [
    {
      "chapter_num": 2,
      "vol_index": 0,
      "ch_index": 1,
      "title": "保持原标题或修改后的标题",
      "summary": "修改后的概要",
      "changed": true,
      "change_reason": "与第1章冲突：原计划X角色出现，但第1章已让其离开"
    },
    {
      "chapter_num": 3,
      "vol_index": 0,
      "ch_index": 2,
      "title": "原标题",
      "summary": "原概要",
      "changed": false
    }
  ],
  "total_changes": 1,
  "high_impact_changes": ["第5章结局需重新设计"]
}

【重要】必须返回所有后续章节，即使没有修改也要包含在数组中。
"""
        
        # Format subsequent chapters for prompt
        chapters_text = ""
        for ch in subsequent_chapters:
            chapters_text += f"\n第{ch['chapter_num']}章 - {ch['title']}\n"
            chapters_text += f"  概要: {ch.get('summary', '') or ch.get('description', '')}\n"
        
        # Analyze the change
        change_description = self._analyze_change(old_outline_item, new_outline_item)
        
        user_prompt = f"""【修改信息】
- 修改章节：第 {modified_chapter_num} 章
- 原大纲：{old_outline_item.get('summary', '') or old_outline_item.get('description', '')}
- 新大纲：{new_outline_item.get('summary', '')}
- 主要变化：{change_description}

【后续章节原大纲】（共 {len(subsequent_chapters)} 章）
{chapters_text}

请一次性返回所有后续章节的调整结果（JSON格式）：
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
            
            result = json.loads(response_text)
            
            # Validate completeness
            if len(result.get('modified_chapters', [])) != len(subsequent_chapters):
                print(f"Warning: LLM returned {len(result.get('modified_chapters', []))} chapters, expected {len(subsequent_chapters)}")
            
            return result
            
        except Exception as e:
            print(f"Batch outline update failed: {e}")
            print(f"Raw response: {response_text}")
            return {
                "modified_chapters": [],
                "total_changes": 0,
                "error": str(e)
            }
    
    def _analyze_change(self, old_item: Dict, new_item: Dict) -> str:
        """Analyze what changed between old and new outline items."""
        old_summary = old_item.get('summary', '') or old_item.get('description', '')
        new_summary = new_item.get('summary', '')
        
        if not old_summary:
            return "新增大纲内容"
        if old_summary == new_summary:
            return "标题或其他元数据变化"
        
        # Simple diff description
        return f"情节从「{old_summary[:30]}...」改为「{new_summary[:30]}...」"
    
    def flatten_outline(self, outline: List[Dict]) -> List[Dict]:
        """
        Flatten nested outline structure to a flat list with indices.
        
        Returns:
            [
                {
                    "chapter_num": 1,
                    "vol_index": 0,
                    "ch_index": 0,
                    "vol_title": "第一卷",
                    "title": "第一章",
                    "summary": "..."
                },
                ...
            ]
        """
        flat = []
        chapter_counter = 1
        
        for v_idx, vol in enumerate(outline):
            vol_title = vol.get('title', f'第{v_idx+1}卷')
            for c_idx, ch in enumerate(vol.get('chapters', [])):
                flat.append({
                    'chapter_num': chapter_counter,
                    'vol_index': v_idx,
                    'ch_index': c_idx,
                    'vol_title': vol_title,
                    'title': ch.get('title', ''),
                    'summary': ch.get('summary', '') or ch.get('description', ''),
                    'description': ch.get('description', '')
                })
                chapter_counter += 1
        
        return flat
    
    async def sync_outline_after_chapter_save(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        chapter_num: int,
        chapter_content: str
    ) -> Optional[Dict[str, Any]]:
        """
        Main entry point: Sync outline after chapter save.
        
        Returns sync result or None if no sync needed.
        """
        # 1. Get project outline
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalars().first()
        
        if not project or not project.meta_info or 'outline' not in project.meta_info:
            return None
        
        outline = project.meta_info['outline']
        flat_outline = self.flatten_outline(outline)
        
        # 2. Find current chapter in outline
        current_outline_item = next(
            (ch for ch in flat_outline if ch['chapter_num'] == chapter_num),
            None
        )
        
        if not current_outline_item:
            return None
        
        # 3. Compare content to outline
        comparison = await self.compare_content_to_outline(
            chapter_content,
            current_outline_item,
            chapter_num
        )
        
        if not comparison.get('needs_update'):
            return {
                "sync_performed": False,
                "deviation_level": comparison.get('deviation_level', 'none'),
                "message": "正文与大纲一致，无需更新"
            }
        
        # 4. Update current chapter outline
        new_outline_item = comparison.get('suggested_outline', {})
        new_outline_item['chapter_num'] = chapter_num
        new_outline_item['vol_index'] = current_outline_item['vol_index']
        new_outline_item['ch_index'] = current_outline_item['ch_index']
        
        # 5. Get subsequent chapters
        subsequent = [ch for ch in flat_outline if ch['chapter_num'] > chapter_num]
        
        cascade_result = {
            "modified_chapters": [],
            "total_changes": 0
        }
        
        if subsequent:
            # 6. Batch update subsequent chapters
            cascade_result = await self.batch_update_subsequent_outline(
                chapter_num,
                current_outline_item,
                new_outline_item,
                subsequent
            )
        
        # 7. Apply changes to database
        await self._apply_outline_changes(
            db, project, outline,
            current_outline_item, new_outline_item,
            cascade_result.get('modified_chapters', [])
        )
        
        return {
            "sync_performed": True,
            "deviation_level": comparison.get('deviation_level'),
            "current_chapter_updated": True,
            "subsequent_updated": len([ch for ch in cascade_result.get('modified_chapters', []) if ch.get('changed')]),
            "total_subsequent": len(subsequent),
            "changes": cascade_result.get('modified_chapters', []),
            "analysis": comparison.get('analysis', '')
        }
    
    async def _apply_outline_changes(
        self,
        db: AsyncSession,
        project: Project,
        outline: List[Dict],
        current_outline_item: Dict,
        new_outline_item: Dict,
        subsequent_changes: List[Dict]
    ):
        """Apply outline changes to the project meta_info."""
        # Update current chapter
        vol_idx = current_outline_item['vol_index']
        ch_idx = current_outline_item['ch_index']
        
        outline[vol_idx]['chapters'][ch_idx]['title'] = new_outline_item.get('title', current_outline_item['title'])
        outline[vol_idx]['chapters'][ch_idx]['summary'] = new_outline_item.get('summary', '')
        
        # Update subsequent chapters
        for change in subsequent_changes:
            if change.get('changed'):
                v_idx = change['vol_index']
                c_idx = change['ch_index']
                outline[v_idx]['chapters'][c_idx]['title'] = change.get('title', '')
                outline[v_idx]['chapters'][c_idx]['summary'] = change.get('summary', '')
        
        # Save to database
        project.meta_info['outline'] = outline
        db.add(project)
        await db.commit()

outline_service = OutlineService()
