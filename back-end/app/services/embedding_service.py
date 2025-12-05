from openai import AsyncOpenAI
from app.core.config import settings
from typing import List

class EmbeddingService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.EMBEDDING_API_KEY,
            base_url=settings.EMBEDDING_BASE_URL
        )
        self.model = "text-embedding-3-small"

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a given text string.
        """
        text = text.replace("\n", " ")
        response = await self.client.embeddings.create(
            input=[text],
            model=self.model
        )
        return response.data[0].embedding

embedding_service = EmbeddingService()
