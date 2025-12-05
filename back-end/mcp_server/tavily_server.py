from mcp.server.fastmcp import FastMCP
from tavily import TavilyClient
import os
from typing import Dict, Any

# Initialize FastMCP server
mcp = FastMCP("Tavily Search")

# Initialize Tavily client
# We expect TAVILY_API_KEY to be present in the environment variables
tavily_api_key = os.getenv("TAVILY_API_KEY")
tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

@mcp.tool()
async def search_inspiration(query: str) -> Dict[str, Any]:
    """
    Search for inspiration using Tavily API.
    
    Args:
        query: The search query string.
        
    Returns:
        A dictionary containing the search results.
    """
    if not tavily_client:
        return {"error": "Tavily API key not configured"}
    
    try:
        # We use advanced search depth for better results
        response = tavily_client.search(query=query, search_depth="advanced")
        return response
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    mcp.run()
