from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from app.core.config import settings
from typing import Dict, Any
import os
import sys

class InspirationService:
    def __init__(self):
        # We don't initialize a persistent client here because stdio client 
        # is best used as a context manager per request or with careful lifecycle management.
        # For this implementation, we'll connect on demand.
        pass

    async def search_inspiration(self, query: str) -> Dict[str, Any]:
        """
        Search for inspiration using Tavily API via MCP.
        """
        # Path to the MCP server script
        # Assuming the script is at back-end/mcp_server/tavily.py relative to the project root
        # We need to resolve the absolute path. 
        # app/services/inspiration_service.py is in back-end/app/services/
        # so project root is ../../..
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "../../.."))
        server_script = os.path.join(project_root, "back-end", "mcp_server", "tavily_server.py")
        
        # Use the specific conda python executable if possible, otherwise sys.executable
        # The user specified .conda env.
        conda_python = os.path.join(project_root, ".conda", "bin", "python")
        python_exe = conda_python if os.path.exists(conda_python) else sys.executable

        server_params = StdioServerParameters(
            command=python_exe,
            args=[server_script],
            env={**os.environ, "TAVILY_API_KEY": settings.TAVILY_API_KEY or ""}
        )

        retries = 2
        for attempt in range(retries + 1):
            try:
                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # Call the tool
                        result = await session.call_tool("search_inspiration", arguments={"query": query})
                        
                        # The result from call_tool is a CallToolResult object
                        # We need to parse it back to the expected dictionary format
                        # Tavily returns a dict, which MCP wraps in content.
                        # For simplicity, we assume the tool returns the raw Tavily response in the first text content
                        # But wait, FastMCP tools return values directly. 
                        # Let's inspect the result structure.
                        
                        # FastMCP automatically serializes the return value into the content.
                        # If it returns a dict, it might be JSON serialized in the text.
                        
                        # However, for this specific integration, let's see what call_tool returns.
                        # It returns a CallToolResult with `content` list.
                        
                        # Let's try to return the data directly if possible.
                        # Actually, looking at FastMCP, it returns the result.
                        # But over the wire, it's text.
                        
                        # Let's assume for now we just return the content[0].text and parse it if needed, 
                        # or if FastMCP handles it.
                        
                        # Actually, let's just return the result.content for now and see.
                        # But wait, the existing frontend expects a specific structure (dict with 'results' key).
                        
                        import json
                        if result.content and hasattr(result.content[0], "text"):
                             # It's likely a JSON string if it's a complex object
                             try:
                                 data = json.loads(result.content[0].text)
                                 return data
                             except:
                                 # Maybe it's just text?
                                 return {"results": [], "raw": result.content[0].text}
                        
                        return {"results": []}

            except Exception as e:
                if attempt == retries:
                    print(f"MCP Tavily search failed after {retries} retries: {e}")
                    return {
                        "error": "search_unavailable",
                        "message": "网络搜索暂时不可用 (MCP)",
                        "fallback": True,
                        "details": str(e)
                    }
                import asyncio
                await asyncio.sleep(1)

inspiration_service = InspirationService()
