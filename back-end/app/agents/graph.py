from langgraph.graph import StateGraph, END, START
from .state import GenesisState
from .nodes import (
    router_node,
    skeleton_agent_node,
    concept_agent_node,
    protagonist_agent_node,
    world_agent_node,
    outline_agent_node,
    first_chapter_agent_node,
    finalizer_node
)


def build_genesis_graph():
    """
    Build the Genesis Wizard LangGraph workflow.
    Uses a sequential structure to ensure dependencies are met (e.g. Outline depends on World).
    Each node internally checks if it should run based on target_agents.
    """
    
    workflow = StateGraph(GenesisState)
    
    # Add all nodes
    workflow.add_node("router", router_node)
    workflow.add_node("skeleton_agent", skeleton_agent_node)
    workflow.add_node("concept_agent", concept_agent_node) # Kept for legacy compatibility if needed
    workflow.add_node("protagonist_agent", protagonist_agent_node)
    workflow.add_node("world_agent", world_agent_node)
    workflow.add_node("outline_agent", outline_agent_node)
    workflow.add_node("first_chapter_agent", first_chapter_agent_node)
    workflow.add_node("finalizer", finalizer_node)
    
    # Set entry point
    workflow.add_edge(START, "router")
    
    # Sequential chain
    # Router -> Skeleton -> Protagonist -> First Chapter -> World -> Outline -> Finalizer
    workflow.add_edge("router", "skeleton_agent")
    workflow.add_edge("skeleton_agent", "protagonist_agent")
    workflow.add_edge("protagonist_agent", "first_chapter_agent")
    workflow.add_edge("first_chapter_agent", "world_agent")
    workflow.add_edge("world_agent", "outline_agent")
    workflow.add_edge("outline_agent", "finalizer")
    
    # Finalizer goes to END
    workflow.add_edge("finalizer", END)
    
    return workflow.compile()


# Global graph instance
genesis_graph = build_genesis_graph()
