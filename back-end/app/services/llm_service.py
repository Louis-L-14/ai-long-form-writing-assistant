from openai import AsyncOpenAI
from app.core.config import settings
from typing import List, Dict, Any, AsyncGenerator
from pathlib import Path

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.LLM_BASE_URL
        )
        self.model = "deepseek-chat"
        self.prompts_dir = Path(__file__).parent.parent.parent / "prompts"
    
    def load_prompt(self, prompt_path: str) -> str:
        """
        Load system prompt from file.
        
        Args:
            prompt_path: Relative path from prompts directory (e.g., 'genesis/concept.txt')
        
        Returns:
            Content of the prompt file
        """
        full_path = self.prompts_dir / prompt_path
        if not full_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {full_path}")
        return full_path.read_text(encoding='utf-8')

    async def generate_text(
        self, 
        messages: List[Dict[str, str]], 
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Generate text using the LLM. Supports streaming.
        """
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=stream
        )

        if stream:
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            # This part is for non-streaming, though the requirement emphasizes streaming.
            # For consistency with the return type, we could yield the single response.
            yield response.choices[0].message.content

llm_service = LLMService()
